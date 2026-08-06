<?php

namespace App\Models;

use App\Enums\RegistrationStatus;
use App\Enums\RoleName;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;
use Throwable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $anonymized_at
 * @property-read UserProfile|null $profile
 * @property-read PointAccount|null $pointAccount
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /** @return HasOne<UserProfile, $this> */
    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    /** @return HasMany<Address, $this> */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /** @return HasMany<RegionUserAssignment, $this> */
    public function regionAssignments(): HasMany
    {
        return $this->hasMany(RegionUserAssignment::class);
    }

    /** @return BelongsToMany<Region, $this> */
    public function assignedRegions(): BelongsToMany
    {
        return $this->belongsToMany(Region::class, 'region_user_assignments')
            ->withPivot(['assignment_type', 'is_active'])
            ->wherePivot('is_active', true)
            ->withTimestamps();
    }

    /** @return HasMany<CollectionRequest, $this> */
    public function collectionRequests(): HasMany
    {
        return $this->hasMany(CollectionRequest::class, 'requester_id');
    }

    /** @return HasMany<CollectionAssignment, $this> */
    public function collectionAssignments(): HasMany
    {
        return $this->hasMany(CollectionAssignment::class, 'assignee_id');
    }

    /** @return HasOne<PointAccount, $this> */
    public function pointAccount(): HasOne
    {
        return $this->hasOne(PointAccount::class);
    }

    /** @return HasMany<PointTransaction, $this> */
    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class);
    }

    /** @return HasMany<Redemption, $this> */
    public function redemptions(): HasMany
    {
        return $this->hasMany(Redemption::class);
    }

    /** @return HasMany<ProgramRegistration, $this> */
    public function programRegistrations(): HasMany
    {
        return $this->hasMany(ProgramRegistration::class);
    }

    /**
     * Kegagalan transport tidak boleh membatalkan pendaftaran. Akun sudah
     * tersimpan ketika notifikasi dikirim, sehingga melempar exception di sini
     * hanya menghasilkan halaman 500 untuk pengguna yang akunnya sebenarnya
     * berhasil dibuat. Kegagalan dicatat, dan pengguna tetap dapat memakai
     * tombol kirim ulang pada halaman verifikasi.
     */
    public function sendEmailVerificationNotification(): void
    {
        try {
            parent::sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            Log::error('Gagal mengirim email verifikasi.', [
                'user_id' => $this->getKey(),
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    public function hasActiveProgramRegistration(int $programId): bool
    {
        $activeStatuses = [
            RegistrationStatus::Pending,
            RegistrationStatus::Confirmed,
            RegistrationStatus::Attended,
        ];

        if ($this->relationLoaded('programRegistrations')) {
            return $this->programRegistrations->contains(
                fn (ProgramRegistration $registration): bool => $registration->program_id === $programId
                    && in_array($registration->status, $activeStatuses, true),
            );
        }

        return $this->programRegistrations()
            ->where('program_id', $programId)
            ->whereIn('status', $activeStatuses)
            ->exists();
    }

    public function canAccessRegion(Region $region): bool
    {
        if ($this->hasRole(RoleName::SuperAdmin->value)) {
            return true;
        }

        $assignedRegionIds = $this->assignedRegions()->pluck('regions.id');
        $primaryRegionId = $this->profile?->primary_region_id;

        // Penugasan staf bersifat turun ke anak wilayah, tidak naik ke wilayah
        // yang cakupannya lebih luas.
        if ($assignedRegionIds->isNotEmpty()) {
            $targetLineage = $region->lineageIds();

            return $assignedRegionIds->contains(
                fn (mixed $assignedId): bool => $targetLineage->contains((int) $assignedId),
            );
        }

        if ($primaryRegionId === null) {
            return false;
        }

        // Warga boleh mengikuti ruang/program pada wilayah asal beserta
        // induknya (contoh: warga RT mengikuti kegiatan RW).
        $primaryRegion = Region::query()->find($primaryRegionId);

        return $region->lineageIds()->contains($primaryRegionId)
            || ($primaryRegion?->lineageIds()->contains($region->id) ?? false);
    }

    /**
     * Wilayah data operasional yang boleh dibaca: wilayah penugasan dan semua
     * turunannya. Untuk warga tanpa penugasan, hanya wilayah utama.
     *
     * @return Collection<int, int>
     */
    public function accessibleRegionIds(): Collection
    {
        if ($this->hasRole(RoleName::SuperAdmin->value)) {
            return Region::query()->pluck('id')->map(fn (mixed $id): int => (int) $id);
        }

        $seedIds = $this->assignedRegions()->pluck('regions.id')->map(fn (mixed $id): int => (int) $id);
        if ($seedIds->isEmpty()) {
            $primaryRegionId = $this->profile?->primary_region_id;

            return $primaryRegionId === null ? collect() : collect([(int) $primaryRegionId]);
        }

        $regions = Region::query()->get(['id', 'parent_id']);
        $accessible = $seedIds->unique()->values();
        do {
            $previousCount = $accessible->count();
            $children = $regions
                ->whereIn('parent_id', $accessible->all())
                ->pluck('id')
                ->map(fn (mixed $id): int => (int) $id);
            $accessible = $accessible->merge($children)->unique()->values();
        } while ($accessible->count() !== $previousCount);

        return $accessible;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'anonymized_at' => 'immutable_datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}

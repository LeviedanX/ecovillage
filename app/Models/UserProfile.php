<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/** @property-read Region|null $primaryRegion */
class UserProfile extends Model
{
    /** Disk publik dipakai agar foto profil bisa dirender lintas halaman tanpa rute bertoken. */
    public const AVATAR_DISK = 'public';

    public const AVATAR_DIRECTORY = 'avatars';

    protected $fillable = [
        'user_id', 'primary_region_id', 'phone', 'avatar_path', 'avatar_disk', 'bio',
        'preferred_locale', 'location_consent_at',
    ];

    protected function casts(): array
    {
        return ['location_consent_at' => 'immutable_datetime'];
    }

    /**
     * URL foto profil, atau null bila pengguna belum pernah mengunggah.
     * `updated_at` dipakai sebagai cache buster supaya foto baru langsung
     * tampil tanpa hard refresh.
     */
    public function avatarUrl(): ?string
    {
        if ($this->avatar_path === null || $this->avatar_path === '') {
            return null;
        }

        $url = Storage::disk($this->avatar_disk ?? self::AVATAR_DISK)->url($this->avatar_path);

        return $this->updated_at === null
            ? $url
            : $url.'?v='.$this->updated_at->getTimestamp();
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Region, $this> */
    public function primaryRegion(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'primary_region_id');
    }
}

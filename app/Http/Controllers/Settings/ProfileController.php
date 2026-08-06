<?php

namespace App\Http\Controllers\Settings;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarUpdateRequest;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Replace the user's profile photo.
     */
    public function updateAvatar(AvatarUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
        $previousPath = $profile->avatar_path;
        $previousDisk = $profile->avatar_disk ?? UserProfile::AVATAR_DISK;

        $path = $request->file('avatar')->store(
            UserProfile::AVATAR_DIRECTORY,
            UserProfile::AVATAR_DISK,
        );

        $profile->forceFill([
            'avatar_path' => $path,
            'avatar_disk' => UserProfile::AVATAR_DISK,
        ])->save();

        // Berkas lama baru dibuang setelah baris profil tersimpan agar
        // kegagalan penulisan tidak meninggalkan avatar yang hilang.
        if ($previousPath !== null && $previousPath !== $path) {
            Storage::disk($previousDisk)->delete($previousPath);
        }

        AuditLog::record(
            actor: $user,
            event: 'profile.avatar-updated',
            auditable: $profile,
            before: ['avatar_path' => $previousPath],
            after: ['avatar_path' => $path],
            request: $request,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto profil diperbarui.']);

        return to_route('profile.edit');
    }

    /**
     * Remove the user's profile photo and fall back to the initials avatar.
     */
    public function destroyAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();
        $profile = $user->profile;

        if ($profile?->avatar_path === null) {
            return to_route('profile.edit');
        }

        $previousPath = $profile->avatar_path;
        Storage::disk($profile->avatar_disk ?? UserProfile::AVATAR_DISK)->delete($previousPath);

        $profile->forceFill(['avatar_path' => null, 'avatar_disk' => null])->save();

        AuditLog::record(
            actor: $user,
            event: 'profile.avatar-removed',
            auditable: $profile,
            before: ['avatar_path' => $previousPath],
            after: ['avatar_path' => null],
            request: $request,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto profil dihapus.']);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        // Invariant: kursi super admin tidak boleh kosong. Anonimisasi mencabut
        // seluruh role, sehingga penghapusan diri akan mengunci sistem karena
        // hanya super admin yang memegang roles.manage.
        if ($user->hasRole(RoleName::SuperAdmin->value)
            && User::role(RoleName::SuperAdmin->value)->count() <= 1) {
            throw ValidationException::withMessages([
                'password' => 'Super admin terakhir tidak dapat menghapus akunnya sendiri.',
            ]);
        }

        DB::transaction(function () use ($user): void {
            $user->loadMissing(['profile', 'addresses']);

            if ($user->profile?->avatar_path !== null) {
                Storage::disk($user->profile->avatar_disk ?? UserProfile::AVATAR_DISK)
                    ->delete($user->profile->avatar_path);
            }

            AuditLog::record(
                actor: $user,
                event: 'account.anonymized',
                auditable: $user,
                before: [
                    'account_state' => 'active',
                    'address_count' => $user->addresses->count(),
                ],
                after: ['account_state' => 'anonymized'],
            );

            $user->profile?->update([
                'primary_region_id' => null,
                'phone' => null,
                'avatar_path' => null,
                'avatar_disk' => null,
                'bio' => null,
                'location_consent_at' => null,
            ]);
            $user->addresses()->update([
                'label' => 'Alamat dihapus',
                'address_line' => 'Data dianonimkan atas permintaan pengguna',
                'postal_code' => null,
                'latitude' => null,
                'longitude' => null,
                'location_consent_at' => null,
                'is_primary' => false,
            ]);
            DB::table('collection_requests')
                ->where('requester_id', $user->id)
                ->update([
                    'address_snapshot' => json_encode(['redacted' => true], JSON_THROW_ON_ERROR),
                    'latitude' => null,
                    'longitude' => null,
                    'location_consent_at' => null,
                ]);
            DB::table('redemptions')
                ->where('user_id', $user->id)
                ->update(['address_snapshot' => null]);
            $user->regionAssignments()->update(['is_active' => false]);
            $user->passkeys()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->syncRoles([]);
            $user->forceFill([
                'name' => "Pengguna nonaktif #{$user->id}",
                'email' => 'deleted+'.Str::uuid().'@anonymized.invalid',
                'email_verified_at' => null,
                'password' => Hash::make(Str::random(64)),
                'remember_token' => null,
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'anonymized_at' => now(),
            ])->save();
        });

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}

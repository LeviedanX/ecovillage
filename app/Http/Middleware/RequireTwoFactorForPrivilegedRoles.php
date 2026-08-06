<?php

namespace App\Http\Middleware;

use App\Enums\RoleName;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Super admin dan pengelola dapat melihat alamat rumah, koordinat tepat, dan
 * seluruh riwayat kontribusi warga di wilayahnya. Untuk data sesensitif itu,
 * satu kata sandi yang bocor lewat phishing sudah cukup membuka semuanya.
 *
 * Middleware ini menahan akses ke jalur istimewa sampai akun tersebut
 * mengaktifkan autentikasi dua faktor. Pengguna tidak dikunci dari aplikasi:
 * ia tetap dapat membuka pengaturan keamanan untuk memasangnya, dan seluruh
 * fitur warga biasa tetap terbuka.
 */
class RequireTwoFactorForPrivilegedRoles
{
    /** @param  Closure(Request): Response  $next */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $this->isRequired($user)) {
            return $next($request);
        }

        if ($user->hasEnabledTwoFactorAuthentication()) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            abort(403, 'Autentikasi dua faktor wajib aktif untuk peran ini.');
        }

        return redirect()
            ->route('security.edit')
            ->with('error', 'Aktifkan autentikasi dua faktor terlebih dahulu untuk membuka menu pengelolaan. Kewenangan Anda mencakup data pribadi warga.');
    }

    private function isRequired(User $user): bool
    {
        if (! config('ecovillage.auth.require_two_factor_for_privileged')) {
            return false;
        }

        return $user->hasRole(RoleName::SuperAdmin->value)
            || $user->hasRole(RoleName::ProgramManager->value);
    }
}

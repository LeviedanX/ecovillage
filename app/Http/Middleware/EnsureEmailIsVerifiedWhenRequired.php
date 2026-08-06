<?php

namespace App\Http\Middleware;

use App\Actions\Fortify\CreateNewUser;
use Closure;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;

/**
 * Seluruh route aplikasi memakai middleware `verified`. Bila deployment belum
 * memiliki mailer, pengguna baru tidak akan pernah menerima tautan verifikasi
 * dan alur pokok berhenti tepat setelah pendaftaran. Flag
 * `REQUIRE_EMAIL_VERIFICATION=false` membuka jalan itu tanpa harus menyunting
 * setiap definisi route, sementara perilaku bawaan tetap memverifikasi.
 *
 * @see CreateNewUser yang menandai akun baru sebagai
 *      terverifikasi ketika flag ini dimatikan, agar tidak ada akun yang
 *      menggantung tanpa `email_verified_at`.
 */
class EnsureEmailIsVerifiedWhenRequired extends EnsureEmailIsVerified
{
    public function handle($request, Closure $next, $redirectToRoute = null)
    {
        if (! config('ecovillage.auth.email_verification_required')) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute);
    }
}

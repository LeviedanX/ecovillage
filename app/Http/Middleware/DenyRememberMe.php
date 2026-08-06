<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sesi "ingat saya" ditiadakan: cookie recaller berumur lima tahun terlalu
 * lama untuk akun yang memegang data warga. Menghapus checkbox dari halaman
 * masuk saja tidak cukup, karena Fortify tetap membaca `remember` dari body
 * request sehingga permintaan yang dirakit manual masih bisa memintanya.
 */
class DenyRememberMe
{
    public function handle(Request $request, Closure $next): Response
    {
        // `merge()` menulis ke input source, yang menang atas query string,
        // sehingga nilai ini berlaku baik untuk body JSON, form, maupun URL.
        $request->merge(['remember' => false]);

        return $next($request);
    }
}

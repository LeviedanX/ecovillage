<?php

namespace App\Http\Middleware;

use App\Support\ContentSecurityPolicy;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Nonce dibuat sebelum view dirender agar tag yang disuntikkan Vite
        // dan skrip inline pada layout memakai nilai yang sama dengan header.
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        if (ContentSecurityPolicy::shouldEnforce()) {
            $response->headers->set(
                config('ecovillage.csp.report_only')
                    ? 'Content-Security-Policy-Report-Only'
                    : 'Content-Security-Policy',
                ContentSecurityPolicy::header($nonce),
            );
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(self)',
        );

        if ($response->headers->get('X-EcoVillage-Public') === 'true') {
            // HandleInertiaRequests menetapkan Vary setelah middleware route;
            // gabungkan kembali dimensi cookie pada lapisan web terluar.
            $response->headers->set('Vary', 'Accept, X-Inertia, Cookie');
        }

        if (app()->environment('production') && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        return $response;
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MarkPublicCacheable
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('GET') && $request->user() === null && $response->isSuccessful()) {
            $response->headers->set('X-EcoVillage-Public', 'true');
            // Marker di atas dipakai service worker untuk cache lokal. Respons
            // Laravel tetap privat karena dapat membawa cookie sesi/CSRF.
            $response->headers->set('Cache-Control', 'private, max-age=0, must-revalidate');
            $response->headers->set('Vary', 'Accept, X-Inertia, Cookie');
        }

        return $response;
    }
}

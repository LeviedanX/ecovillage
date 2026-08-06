<?php

use App\Http\Middleware\EnsureEmailIsVerifiedWhenRequired;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            // Menimpa alias bawaan Laravel agar `verified` menghormati
            // REQUIRE_EMAIL_VERIFICATION tanpa menyunting definisi route.
            'verified' => EnsureEmailIsVerifiedWhenRequired::class,
        ]);

        $middleware->encryptCookies(except: ['sidebar_state']);

        // Proxy tepercaya dikonfigurasi pada AppServiceProvider::boot() karena
        // `env()` di berkas ini tidak membaca `.env` (bootstrapper environment
        // baru berjalan setelah callback middleware dievaluasi).

        $middleware->web(append: [
            // Batas laju menyeluruh; limiter `web` didefinisikan pada
            // FortifyServiceProvider. Ditaruh paling awal agar permintaan
            // berlebih ditolak sebelum menyentuh database.
            'throttle:web',
            SecurityHeaders::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        /*
         * Render HTTP errors through Inertia so a visitor who hits a dead link
         * or an expired session lands on a branded page with a way back,
         * instead of Laravel's bare error screen with no navigation.
         *
         * 5xx keeps the debug screen locally, where the stack trace is what a
         * developer actually needs; 4xx is always the friendly page.
         */
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if ($request->is('api/*') || $request->expectsJson()) {
                return $response;
            }

            $clientError = in_array($status, [403, 404, 419, 429], true);
            $serverError = in_array($status, [500, 503], true)
                && ! app()->environment(['local', 'testing']);

            if (! $clientError && ! $serverError) {
                return $response;
            }

            return Inertia::render('error', ['status' => $status])
                ->toResponse($request)
                ->setStatusCode($status);
        });
    })->create();

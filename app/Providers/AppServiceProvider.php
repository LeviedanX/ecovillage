<?php

namespace App\Providers;

use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\ForumSpace;
use App\Models\PointTransaction;
use App\Models\Redemption;
use App\Models\User;
use App\Policies\CollectionRequestPolicy;
use App\Policies\ForumSpacePolicy;
use App\Policies\PointTransactionPolicy;
use App\Policies\RedemptionPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(CollectionRequest::class, CollectionRequestPolicy::class);
        Gate::policy(PointTransaction::class, PointTransactionPolicy::class);
        Gate::policy(Redemption::class, RedemptionPolicy::class);
        Gate::policy(ForumSpace::class, ForumSpacePolicy::class);
        Gate::before(fn (User $user): ?bool => $user->hasRole(RoleName::SuperAdmin->value) ? true : null);

        $this->configureDefaults();
        $this->configureTrustedProxies();
        $this->forceDebugOffInProduction();
    }

    /**
     * `APP_DEBUG=true` yang tertinggal di production adalah cara paling umum
     * membocorkan stack trace, query, dan nilai environment kepada pengunjung.
     * Nilai itu tidak boleh bergantung pada disiplin pengisian env, jadi di
     * production ia dipaksa mati dan pelanggarannya dicatat agar terlihat.
     * `ecovillage:check-production` tetap menandainya sebagai kegagalan rilis.
     */
    protected function forceDebugOffInProduction(): void
    {
        if (! app()->isProduction() || ! config('app.debug')) {
            return;
        }

        config()->set('app.debug', false);

        Log::critical('APP_DEBUG aktif pada environment production dan dipaksa nonaktif. Perbaiki konfigurasi environment.');
    }

    /**
     * Production menempatkan Nginx dan load balancer TLS di depan PHP-FPM.
     * Tanpa daftar proxy tepercaya, Laravel membaca skema dan IP dari koneksi
     * proxy: `Strict-Transport-Security` tidak pernah dikirim karena request
     * dianggap HTTP, dan setiap baris audit menyimpan IP proxy alih-alih IP
     * pengguna. `TRUSTED_PROXIES` berisi daftar CIDR proxy dipisahkan koma,
     * atau `*` bila edge sudah menjamin `X-Forwarded-*` tidak dapat dipalsukan
     * klien. Kosong berarti tidak ada proxy yang dipercaya, aman untuk
     * deployment single-host tanpa reverse proxy.
     */
    protected function configureTrustedProxies(): void
    {
        $proxies = trim((string) config('ecovillage.trusted_proxies', ''));

        if ($proxies === '') {
            return;
        }

        TrustProxies::at($proxies === '*'
            ? '*'
            : array_values(array_filter(array_map('trim', explode(',', $proxies)))));

        TrustProxies::withHeaders(
            Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO
            | Request::HEADER_X_FORWARDED_AWS_ELB,
        );
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        /*
         * Warm the next page's JavaScript while the browser is idle. Each
         * Inertia page is its own chunk, so without this the first click on a
         * link pays a round trip before anything can render. The low
         * concurrency keeps the prefetch off the critical path of the page the
         * visitor is actually looking at.
         */
        Vite::prefetch(concurrency: 3);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}

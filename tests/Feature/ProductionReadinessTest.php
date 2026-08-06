<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class ProductionReadinessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Konfigurasi yang seharusnya lulus. Setiap test kemudian merusak satu
     * nilai saja, sehingga kegagalan yang muncul dapat dipastikan berasal dari
     * nilai itu dan bukan dari lingkungan test.
     */
    private function applyHealthyProductionConfig(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        config()->set([
            'app.debug' => false,
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'app.url' => 'https://ecovillage.example',
            'session.secure' => true,
            'session.http_only' => true,
            'session.same_site' => 'lax',
            'ecovillage.trusted_proxies' => '10.0.0.0/8',
            'ecovillage.auth.email_verification_required' => true,
            'ecovillage.demo_accounts_enabled' => false,
            'ecovillage.demo_password' => 'kata-sandi-demo-yang-diganti',
            'ecovillage.uploads.disk' => 'local',
            'mail.default' => 'smtp',
            'database.connections.mysql.password' => 'kata-sandi-database-produksi',
            'database.redis.default.password' => 'kata-sandi-redis-produksi',
        ]);
    }

    public function test_a_correct_production_configuration_passes(): void
    {
        $this->applyHealthyProductionConfig();

        $this->artisan('ecovillage:check-production')->assertSuccessful();
    }

    public function test_debug_mode_fails_the_release_gate(): void
    {
        $this->applyHealthyProductionConfig();
        config()->set('app.debug', true);

        $this->artisan('ecovillage:check-production')->assertFailed();
    }

    public function test_insecure_session_cookie_fails_the_release_gate(): void
    {
        $this->applyHealthyProductionConfig();
        config()->set('session.secure', false);

        $this->artisan('ecovillage:check-production')->assertFailed();
    }

    public function test_placeholder_secret_fails_the_release_gate(): void
    {
        $this->applyHealthyProductionConfig();
        config()->set('database.connections.mysql.password', 'CHANGE_ME_WITH_A_LONG_RANDOM_PASSWORD');

        $this->artisan('ecovillage:check-production')->assertFailed();
    }

    public function test_non_delivering_mailer_fails_when_verification_is_required(): void
    {
        $this->applyHealthyProductionConfig();
        config()->set('mail.default', 'log');

        $this->artisan('ecovillage:check-production')->assertFailed();

        // Tanpa kewajiban verifikasi, driver yang tidak mengirim email bukan
        // penghenti rilis: alur pokok tetap dapat diselesaikan pengguna.
        config()->set('ecovillage.auth.email_verification_required', false);

        $this->artisan('ecovillage:check-production')->assertSuccessful();
    }

    public function test_demo_accounts_fail_the_release_gate(): void
    {
        $this->applyHealthyProductionConfig();
        config()->set('ecovillage.demo_accounts_enabled', true);

        $this->artisan('ecovillage:check-production')->assertFailed();
    }

    public function test_http_url_fails_the_release_gate(): void
    {
        $this->applyHealthyProductionConfig();
        config()->set('app.url', 'http://ecovillage.example');

        $this->artisan('ecovillage:check-production')->assertFailed();
    }

    public function test_debug_is_forced_off_at_runtime_in_production(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config()->set('app.debug', true);

        Log::spy();

        (new AppServiceProvider($this->app))->boot();

        $this->assertFalse(config('app.debug'));
        Log::shouldHaveReceived('critical')->once();
    }
}

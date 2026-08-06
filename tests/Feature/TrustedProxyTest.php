<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Di production, Nginx dan load balancer TLS berada di depan PHP-FPM. Bila
 * proxy tidak dipercaya, Laravel melihat setiap request sebagai HTTP dari IP
 * proxy: HSTS hilang dan seluruh audit log kehilangan IP pengguna.
 */
class TrustedProxyTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TrustProxies::at([]);

        parent::tearDown();
    }

    private function bootWithProxies(string $proxies): void
    {
        config()->set('ecovillage.trusted_proxies', $proxies);

        (new AppServiceProvider($this->app))->boot();

        Route::get('/__proxy-probe', fn () => response()->json([
            'secure' => request()->isSecure(),
            'ip' => request()->ip(),
        ]))->middleware('web');
    }

    public function test_forwarded_headers_are_ignored_when_no_proxy_is_trusted(): void
    {
        $this->bootWithProxies('');

        $this->get('/__proxy-probe', [
            'X-Forwarded-Proto' => 'https',
            'X-Forwarded-For' => '203.0.113.10',
        ])->assertJson(['secure' => false, 'ip' => '127.0.0.1']);
    }

    public function test_forwarded_headers_are_honoured_for_a_trusted_proxy(): void
    {
        $this->bootWithProxies('127.0.0.1');

        $this->get('/__proxy-probe', [
            'X-Forwarded-Proto' => 'https',
            'X-Forwarded-For' => '203.0.113.10',
        ])->assertJson(['secure' => true, 'ip' => '203.0.113.10']);
    }

    public function test_hsts_is_sent_for_a_forwarded_https_request_in_production(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        $this->bootWithProxies('*');

        $this->get('/', ['X-Forwarded-Proto' => 'https'])
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000');
    }
}

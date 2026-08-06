<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_responses_include_safe_baseline_headers(): void
    {
        $response = $this->get('/');

        $response->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_hsts_is_only_sent_for_https_in_production(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->get('http://localhost/')->assertHeaderMissing('Strict-Transport-Security');
        $this->get('https://localhost/')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000');
    }

    public function test_service_worker_marker_does_not_make_session_response_publicly_cacheable(): void
    {
        $this->get('/edukasi')
            ->assertOk()
            ->assertHeader('X-EcoVillage-Public', 'true')
            ->assertHeader('Cache-Control', 'max-age=0, must-revalidate, private')
            ->assertHeader('Vary', 'Accept, X-Inertia, Cookie');
    }
}

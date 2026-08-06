<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentSecurityPolicyTest extends TestCase
{
    use RefreshDatabase;

    private ?string $hotBackup = null;

    /**
     * Kebijakan hanya ditegakkan untuk aset hasil build, jadi seluruh test di
     * kelas ini berjalan pada mode itu. Tanpa penyetelan ini hasilnya berubah
     * hanya karena `npm run dev` kebetulan sedang berjalan di mesin pengembang.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $hot = public_path('hot');

        if (file_exists($hot)) {
            $this->hotBackup = (string) file_get_contents($hot);
            unlink($hot);
        }
    }

    protected function tearDown(): void
    {
        if ($this->hotBackup !== null) {
            file_put_contents(public_path('hot'), $this->hotBackup);
            $this->hotBackup = null;
        }

        parent::tearDown();
    }

    private function policyOf(string $uri = '/'): string
    {
        return (string) $this->get($uri)->headers->get('Content-Security-Policy');
    }

    /** Menjalankan callback seolah server Vite berjalan pada origin tertentu. */
    private function withViteDevServer(?string $origin, callable $callback): void
    {
        $hot = public_path('hot');

        $origin === null ? @unlink($hot) : file_put_contents($hot, $origin);

        try {
            $callback();
        } finally {
            @unlink($hot);
        }
    }

    public function test_policy_is_sent_and_locks_down_the_dangerous_directives(): void
    {
        $policy = $this->policyOf();

        $this->assertStringContainsString("default-src 'self'", $policy);
        $this->assertStringContainsString("object-src 'none'", $policy);
        $this->assertStringContainsString("frame-ancestors 'none'", $policy);
        $this->assertStringContainsString("base-uri 'self'", $policy);
        $this->assertStringContainsString("form-action 'self'", $policy);
    }

    public function test_scripts_never_fall_back_to_unsafe_inline_or_eval(): void
    {
        preg_match('/script-src ([^;]+)/', $this->policyOf(), $matches);
        $scriptSources = $matches[1] ?? '';

        $this->assertStringNotContainsString("'unsafe-inline'", $scriptSources);
        $this->assertStringNotContainsString("'unsafe-eval'", $scriptSources);
        $this->assertMatchesRegularExpression("/'nonce-[A-Za-z0-9+\/=]+'/", $scriptSources);
    }

    public function test_every_inline_script_carries_the_nonce_from_the_header(): void
    {
        $response = $this->get('/');
        $html = $response->getContent();

        preg_match("/'nonce-([^']+)'/", (string) $response->headers->get('Content-Security-Policy'), $header);
        $nonce = $header[1] ?? '';

        $this->assertNotSame('', $nonce);

        /*
         * Hanya skrip inline yang benar-benar dieksekusi yang tunduk pada
         * `script-src`. Inertia menaruh props halaman pada
         * `<script type="application/json">`, dan peramban memperlakukan blok
         * bertipe non-JavaScript sebagai data, bukan kode.
         */
        preg_match_all('/<script\b(?![^>]*\bsrc=)(?![^>]*type="application\/json")[^>]*>/i', (string) $html, $inlineScripts);

        $this->assertNotEmpty($inlineScripts[0], 'Layout tidak lagi memuat skrip inline; test ini perlu ditinjau.');

        foreach ($inlineScripts[0] as $tag) {
            $this->assertStringContainsString('nonce="'.$nonce.'"', $tag);
        }
    }

    public function test_the_nonce_changes_between_requests(): void
    {
        $this->assertNotSame($this->policyOf(), $this->policyOf());
    }

    public function test_map_origin_is_allowed_for_images_and_connections(): void
    {
        config()->set('ecovillage.map.style_url', 'https://tiles.example.test/style.json?key=abc');
        config()->set('ecovillage.map.tile_origins', 'https://sprites.example.test');

        $policy = $this->policyOf('/peta');

        // Hanya skema dan host yang boleh masuk; path atau query membuat
        // direktif tidak pernah cocok dengan permintaan sebenarnya.
        $this->assertStringContainsString('img-src \'self\' data: blob: https://tiles.example.test https://sprites.example.test', $policy);
        $this->assertStringContainsString("connect-src 'self' https://tiles.example.test https://sprites.example.test", $policy);
        $this->assertStringNotContainsString('style.json', $policy);
        $this->assertStringNotContainsString('key=abc', $policy);
    }

    public function test_maplibre_workers_are_permitted(): void
    {
        $this->assertStringContainsString("worker-src 'self' blob:", $this->policyOf('/peta'));
    }

    /**
     * Setiap aset yang benar-benar dirender halaman harus cocok dengan
     * direktif yang mengaturnya. Tanpa test ini, kebijakan dapat terlihat
     * benar sebagai teks tetapi memblokir stylesheet sehingga halaman tampil
     * tanpa CSS sama sekali.
     */
    public function test_every_asset_the_page_emits_is_permitted_by_the_policy(): void
    {
        $this->withViteDevServer(null, function (): void {
            $response = $this->get('/');
            $policy = (string) $response->headers->get('Content-Security-Policy');
            $html = (string) $response->getContent();

            $directives = [];
            foreach (explode('; ', $policy) as $directive) {
                [$name, $sources] = array_pad(explode(' ', $directive, 2), 2, '');
                $directives[$name] = $sources;
            }

            preg_match_all('/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/i', $html, $stylesheets);
            preg_match_all('/<script[^>]*src="([^"]+)"/i', $html, $scripts);

            $this->assertNotEmpty($stylesheets[1], 'Halaman tidak merender stylesheet; test ini perlu ditinjau.');
            $this->assertNotEmpty($scripts[1], 'Halaman tidak merender script; test ini perlu ditinjau.');

            $assets = [
                'style-src' => $stylesheets[1],
                'script-src' => $scripts[1],
            ];

            $originOf = static function (string $url): string {
                $parts = parse_url($url);

                if (! isset($parts['scheme'], $parts['host'])) {
                    return '';
                }

                return $parts['scheme'].'://'.$parts['host']
                    .(isset($parts['port']) ? ':'.$parts['port'] : '');
            };

            // Vite menghasilkan URL absolut berdasarkan APP_URL. URL itu tetap
            // same-origin bagi pengunjung, sehingga tercakup oleh 'self'.
            $sameOrigin = $originOf((string) config('app.url'));

            foreach ($assets as $directive => $urls) {
                foreach ($urls as $url) {
                    $origin = $originOf($url);

                    if ($origin === '' || $origin === $sameOrigin) {
                        $this->assertStringContainsString(
                            "'self'",
                            $directives[$directive] ?? '',
                            "Aset same-origin {$url} akan diblokir oleh {$directive}.",
                        );

                        continue;
                    }

                    $this->assertStringContainsString(
                        $origin,
                        $directives[$directive] ?? '',
                        "Aset {$url} akan diblokir oleh {$directive}.",
                    );
                }
            }
        });
    }

    /**
     * Selama server Vite berjalan, aset dilayani dari origin lain yang tidak
     * selalu dapat dinyatakan CSP: alamat IPv6 literal seperti `[::1]` bukan
     * `host-source` yang sah, sehingga peramban tetap memblokirnya dan
     * halaman kehilangan seluruh CSS. Kebijakan karena itu tidak ditegakkan
     * pada mode hot; yang dilindungi adalah aset hasil build.
     */
    public function test_policy_is_not_enforced_while_the_vite_dev_server_runs(): void
    {
        $this->withViteDevServer('http://[::1]:5173', function (): void {
            $response = $this->get('/');

            $response->assertOk()
                ->assertHeaderMissing('Content-Security-Policy')
                ->assertHeaderMissing('Content-Security-Policy-Report-Only');
        });

        // Begitu server dev berhenti, kebijakan kembali ditegakkan.
        $this->withViteDevServer(null, function (): void {
            $this->assertStringContainsString("default-src 'self'", $this->policyOf());
        });
    }

    public function test_policy_can_be_switched_to_report_only(): void
    {
        config()->set('ecovillage.csp.report_only', true);

        $response = $this->get('/');

        $response->assertHeaderMissing('Content-Security-Policy');
        $this->assertNotNull($response->headers->get('Content-Security-Policy-Report-Only'));
    }
}

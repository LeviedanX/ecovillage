<?php

namespace Tests\Feature;

use App\Models\EducationContent;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Metadata SEO hanya berguna bila HTML awal sudah membawanya. Test ini
 * memeriksa respons apa adanya, persis seperti yang diterima crawler dan
 * pratinjau tautan yang tidak menjalankan JavaScript.
 *
 * Isi halaman itu sendiri dirender proses SSR yang tidak berjalan saat
 * pengujian, jadi yang dijaga di sini adalah tag yang ditetapkan server dan
 * kelengkapan sitemap serta robots.
 */
class SeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Halaman statis dilayani dari tabel page_contents; tanpa seed ini
        // `/tentang` menjawab 404 dan yang teruji bukan lagi metadata.
        $this->seed(SiteContentSeeder::class);
    }

    private function metaOf(TestResponse $response, string $property): ?string
    {
        $html = (string) $response->getContent();
        $pattern = '/<meta[^>]*(?:name|property)="'.preg_quote($property, '/').'"[^>]*content="([^"]*)"/i';

        if (preg_match($pattern, $html, $matches) !== 1) {
            // Urutan atribut dapat terbalik ketika dirender ulang klien.
            $pattern = '/<meta[^>]*content="([^"]*)"[^>]*(?:name|property)="'.preg_quote($property, '/').'"/i';

            return preg_match($pattern, $html, $matches) === 1 ? $matches[1] : null;
        }

        return $matches[1];
    }

    public function test_sitemap_lists_public_pages_and_published_content(): void
    {
        $published = EducationContent::query()->where('status', 'published')->first();

        $response = $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

        $xml = (string) $response->getContent();

        $this->assertStringContainsString('<urlset', $xml);
        foreach ([route('home'), route('education.index'), route('public.programs.index'), route('catalog')] as $url) {
            $this->assertStringContainsString('<loc>'.e($url).'</loc>', $xml);
        }

        if ($published !== null) {
            $this->assertStringContainsString(e(route('education.show', $published->slug)), $xml);
        }

        // Halaman terautentikasi tidak boleh diiklankan kepada crawler.
        foreach (['/dashboard', '/admin', '/settings'] as $private) {
            $this->assertStringNotContainsString('<loc>'.e(url($private)), $xml);
        }
    }

    public function test_sitemap_is_valid_xml(): void
    {
        $previous = libxml_use_internal_errors(true);
        $document = simplexml_load_string((string) $this->get('/sitemap.xml')->getContent());
        libxml_use_internal_errors($previous);

        $this->assertNotFalse($document, 'sitemap.xml bukan XML yang sah.');
    }

    public function test_robots_closes_authenticated_areas_and_points_at_the_sitemap(): void
    {
        $body = (string) $this->get('/robots.txt')->assertOk()->getContent();

        $this->assertStringContainsString('User-agent: *', $body);
        $this->assertStringContainsString('Sitemap: '.route('sitemap'), $body);

        foreach (['/dashboard', '/admin', '/settings', '/pengumpulan', '/operasional'] as $private) {
            $this->assertStringContainsString('Disallow: '.$private, $body);
        }
    }

    /**
     * Judul, deskripsi, dan og:title dirender komponen React, sehingga baru
     * muncul ketika proses SSR berjalan. Bagian itu diuji lewat peramban pada
     * `tests/e2e/seo.spec.ts`. Yang diperiksa di sini adalah metadata yang
     * ditulis layout dan karena itu tetap ada meski SSR sedang mati.
     */
    public function test_public_pages_carry_canonical_and_open_graph(): void
    {
        foreach (['/' => route('home'), '/tentang' => route('about')] as $path => $expected) {
            $response = $this->get($path)->assertOk();
            $html = (string) $response->getContent();

            $this->assertStringContainsString('<link rel="canonical" href="'.$expected.'"', $html);
            $this->assertSame($expected, $this->metaOf($response, 'og:url'));
            $this->assertSame('website', $this->metaOf($response, 'og:type'));
            $this->assertSame('id_ID', $this->metaOf($response, 'og:locale'));
            $this->assertSame('EcoVillage.id', $this->metaOf($response, 'og:site_name'));
        }
    }

    public function test_canonical_drops_query_parameters(): void
    {
        // Tanpa ini, setiap kombinasi filter dan parameter pelacakan tampak
        // sebagai halaman terpisah dengan isi yang sama.
        $response = $this->get('/edukasi?q=kompos&utm_source=wa')->assertOk();

        $this->assertStringContainsString(
            '<link rel="canonical" href="'.route('education.index').'"',
            (string) $response->getContent(),
        );
    }

    public function test_layout_no_longer_hardcodes_social_tags(): void
    {
        // Tag statis pada layout akan menggandakan Open Graph dengan isi yang
        // sama untuk seluruh halaman, mengalahkan nilai per halaman.
        $blade = (string) file_get_contents(resource_path('views/app.blade.php'));

        $this->assertStringNotContainsString('og:image', $blade);
        $this->assertStringNotContainsString('twitter:card', $blade);
    }
}

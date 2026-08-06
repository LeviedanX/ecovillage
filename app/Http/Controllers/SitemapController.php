<?php

namespace App\Http\Controllers;

use App\Models\EducationContent;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Sitemap dan robots.txt dibangun dari isi yang benar-benar terbit, bukan dari
 * daftar statis yang cepat basi. Halaman terautentikasi sengaja ditutup: isinya
 * tidak dapat dijangkau crawler dan tidak ada gunanya diindeks, sementara
 * membiarkannya terbuka mengundang perayapan yang sia-sia.
 */
class SitemapController extends Controller
{
    private const CACHE_KEY = 'public.sitemap.v1';

    public function index(): Response
    {
        $xml = Cache::remember(self::CACHE_KEY, now()->addHour(), function (): string {
            $urls = [
                ...$this->staticPages(),
                ...$this->educationPages(),
                ...$this->programPages(),
            ];

            $body = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
                .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

            foreach ($urls as $entry) {
                $body .= '  <url>'."\n"
                    .'    <loc>'.e($entry['loc']).'</loc>'."\n"
                    .($entry['lastmod'] === null ? '' : '    <lastmod>'.$entry['lastmod'].'</lastmod>'."\n")
                    .'    <changefreq>'.$entry['changefreq'].'</changefreq>'."\n"
                    .'    <priority>'.$entry['priority'].'</priority>'."\n"
                    .'  </url>'."\n";
            }

            return $body.'</urlset>'."\n";
        });

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    public function robots(Request $request): Response
    {
        $lines = [
            'User-agent: *',
            // Area terautentikasi tidak pernah dapat dirayapi dan tidak boleh
            // muncul di hasil pencarian.
            'Disallow: /dashboard',
            'Disallow: /admin',
            'Disallow: /operasional',
            'Disallow: /settings',
            'Disallow: /pengumpulan',
            'Disallow: /poin',
            'Disallow: /dampak',
            'Disallow: /marketplace',
            'Disallow: /forum',
            'Disallow: /notifikasi',
            'Disallow: /pencarian',
            'Disallow: /kegiatan',
            'Disallow: /register/pending',
            '',
            'Sitemap: '.route('sitemap'),
            '',
        ];

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /** @return array<int, array{loc: string, lastmod: string|null, changefreq: string, priority: string}> */
    private function staticPages(): array
    {
        $routes = [
            ['home', '1.0', 'daily'],
            ['about', '0.8', 'monthly'],
            ['problem-solution', '0.6', 'monthly'],
            ['platform', '0.6', 'monthly'],
            ['ecopore', '0.7', 'monthly'],
            ['ecocycle', '0.7', 'monthly'],
            ['faq', '0.5', 'monthly'],
            ['contact', '0.5', 'monthly'],
            ['privacy', '0.3', 'yearly'],
            ['education.index', '0.9', 'weekly'],
            ['public.programs.index', '0.9', 'weekly'],
            ['catalog', '0.7', 'weekly'],
            ['public.map', '0.7', 'weekly'],
            ['impact.methodology', '0.5', 'monthly'],
        ];

        return array_map(
            static fn (array $route): array => [
                'loc' => route($route[0]),
                'lastmod' => null,
                'changefreq' => $route[2],
                'priority' => $route[1],
            ],
            $routes,
        );
    }

    /** @return array<int, array{loc: string, lastmod: string|null, changefreq: string, priority: string}> */
    private function educationPages(): array
    {
        return EducationContent::query()
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->limit(2000)
            ->get(['slug', 'updated_at'])
            ->map(fn (EducationContent $content): array => [
                'loc' => route('education.show', $content->slug),
                'lastmod' => $content->updated_at?->toAtomString(),
                'changefreq' => 'monthly',
                'priority' => '0.8',
            ])
            ->all();
    }

    /** @return array<int, array{loc: string, lastmod: string|null, changefreq: string, priority: string}> */
    private function programPages(): array
    {
        return Program::query()
            ->whereIn('status', ['published', 'registration_open', 'registration_closed', 'completed'])
            ->latest('starts_at')
            ->limit(2000)
            ->get(['slug', 'updated_at'])
            ->map(fn (Program $program): array => [
                'loc' => route('public.programs.show', $program->slug),
                'lastmod' => $program->updated_at?->toAtomString(),
                'changefreq' => 'weekly',
                'priority' => '0.8',
            ])
            ->all();
    }

    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}

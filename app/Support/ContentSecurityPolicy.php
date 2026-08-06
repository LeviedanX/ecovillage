<?php

namespace App\Support;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;

/**
 * Menyusun Content Security Policy dari sumber yang benar-benar dipakai
 * halaman: bundle Vite same-origin, satu skrip inline ber-nonce pada layout,
 * style MapLibre beserta tile-nya, dan worker MapLibre yang dibuat dari blob.
 *
 * Kebijakan ini sengaja tidak memakai `'unsafe-inline'` pada `script-src`.
 * Satu-satunya skrip inline adalah blok arming reveal pada `app.blade.php`,
 * dan blok itu memakai nonce yang sama dengan tag yang disuntikkan Vite.
 */
class ContentSecurityPolicy
{
    /**
     * Radix dan MapLibre menulis gaya lewat atribut `style` pada elemen.
     * `style-src` mencakup atribut itu, sehingga `'unsafe-inline'` di sini
     * tidak dapat dihindari tanpa menulis ulang pustaka komponen. Risikonya
     * jauh lebih kecil daripada pada `script-src`: injeksi gaya tidak dapat
     * mengeksekusi kode.
     */
    private const STYLE_SOURCES = "'self' 'unsafe-inline'";

    /**
     * Kebijakan hanya ditegakkan untuk aset yang benar-benar dikirim ke
     * pengguna, yaitu hasil build. Selama `npm run dev` berjalan, seluruh aset
     * dilayani server Vite pada origin lain dan CSP tidak dapat menjelaskannya
     * dengan benar: grammar `host-source` pada spesifikasi CSP tidak mengenal
     * alamat IPv6 literal, sehingga origin seperti `http://[::1]:5173` tetap
     * diblokir peramban walaupun sudah dicantumkan pada direktif. Hasilnya
     * halaman tampil tanpa CSS sama sekali.
     *
     * Menegakkan CSP pada mode hot juga tidak menambah keamanan: ia menuntut
     * `'unsafe-eval'` untuk hot reload dan mengizinkan origin dev secara
     * penuh. Yang dijaga adalah bentuk kebijakan pada build production, dan
     * itu diuji oleh `ContentSecurityPolicyTest` serta suite Playwright yang
     * selalu berjalan di atas aset hasil build.
     */
    public static function shouldEnforce(): bool
    {
        return (bool) config('ecovillage.csp.enabled') && ! Vite::isRunningHot();
    }

    /** @return array<int, string> */
    public static function externalOrigins(): array
    {
        $origins = [
            self::originOf((string) config('ecovillage.map.style_url')),
            ...array_map(
                self::originOf(...),
                array_filter(array_map(
                    trim(...),
                    explode(',', (string) config('ecovillage.map.tile_origins')),
                )),
            ),
        ];

        return array_values(array_unique(array_filter($origins)));
    }

    public static function header(string $nonce): string
    {
        $external = implode(' ', self::externalOrigins());
        $externalSuffix = $external === '' ? '' : ' '.$external;

        $scriptSources = "'self' 'nonce-{$nonce}'";
        $styleSources = self::STYLE_SOURCES;
        $imageSources = "'self' data: blob:".$externalSuffix;
        $fontSources = "'self' data:";
        $connectSources = "'self'".$externalSuffix;

        return implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src {$scriptSources}",
            "style-src {$styleSources}",
            "img-src {$imageSources}",
            "font-src {$fontSources}",
            "connect-src {$connectSources}",
            // MapLibre menjalankan parsing tile pada worker yang dibuat dari
            // blob URL; tanpa `blob:` peta gagal memuat sepenuhnya.
            "worker-src 'self' blob:",
            "manifest-src 'self'",
        ]);
    }

    /**
     * Hanya skema dan host yang boleh masuk kebijakan. Path atau query pada
     * nilai environment akan membuat direktif tidak pernah cocok.
     */
    private static function originOf(string $url): string
    {
        if (! Str::startsWith($url, ['http://', 'https://'])) {
            return '';
        }

        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return '';
        }

        $port = isset($parts['port']) ? ':'.$parts['port'] : '';

        return "{$parts['scheme']}://{$parts['host']}{$port}";
    }
}

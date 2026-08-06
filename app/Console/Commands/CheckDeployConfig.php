<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Yaml\Yaml;

/**
 * Memeriksa kontrak antar berkas deployment yang tidak dapat ditangkap test
 * aplikasi: batas ukuran unggahan yang harus selaras antara Nginx, PHP, dan
 * validator; stage Dockerfile; serta bentuk compose.yaml.
 *
 * Ini bukan pengganti `nginx -t` dan `docker compose config`, yang tetap harus
 * dijalankan pada host yang memiliki engine-nya. Yang dijaga di sini adalah
 * ketidakcocokan antar berkas, penyebab kegagalan yang paling sering lolos ke
 * production karena setiap berkas terlihat benar bila dibaca sendiri-sendiri.
 */
class CheckDeployConfig extends Command
{
    protected $signature = 'ecovillage:check-deploy-config';

    protected $description = 'Memeriksa konsistensi Dockerfile, compose.yaml, Nginx, dan php.ini.';

    /** @var array<int, array{0: string, 1: string, 2: string}> */
    private array $rows = [];

    private bool $failed = false;

    public function handle(): int
    {
        $this->rows = [];
        $this->failed = false;

        $this->checkUploadLimits();
        $this->checkNginx();
        $this->checkDockerfile();
        $this->checkCompose();

        $this->table(['Status', 'Pemeriksaan', 'Keterangan'], $this->rows);

        if ($this->failed) {
            $this->newLine();
            $this->error('Konfigurasi deployment tidak konsisten.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Konfigurasi deployment konsisten. Jalankan `nginx -t` dan `docker compose config` pada host ber-engine untuk verifikasi runtime.');

        return self::SUCCESS;
    }

    private function ok(string $check, string $detail): void
    {
        $this->rows[] = ['LULUS', $check, $detail];
    }

    private function bad(string $check, string $detail): void
    {
        $this->rows[] = ['GAGAL', $check, $detail];
        $this->failed = true;
    }

    private function contents(string $relative): string
    {
        $path = base_path($relative);

        return is_readable($path) ? (string) file_get_contents($path) : '';
    }

    /**
     * Validator menerima lima foto sekaligus. Bila batas Nginx atau PHP lebih
     * kecil dari total itu, unggahan penuh ditolak sebelum validasi berjalan
     * dan pengguna melihat kegagalan CSRF 419, bukan pesan ukuran berkas.
     */
    private function checkUploadLimits(): void
    {
        $perImageKb = (int) config('ecovillage.uploads.max_image_kilobytes');
        $maxPhotos = 5;
        $requiredMb = (int) ceil(($perImageKb * $maxPhotos) / 1024);

        $nginxMb = $this->megabytesFrom($this->contents('docker/nginx/default.conf'), '/client_max_body_size\s+(\d+)([mMkK])/');
        $postMb = $this->megabytesFrom($this->contents('docker/php/php.ini'), '/post_max_size\s*=\s*(\d+)([mMkK])/');
        $uploadMb = $this->megabytesFrom($this->contents('docker/php/php.ini'), '/upload_max_filesize\s*=\s*(\d+)([mMkK])/');

        $nginxMb >= $requiredMb
            ? $this->ok('client_max_body_size', "{$nginxMb}M memenuhi kebutuhan {$requiredMb}M")
            : $this->bad('client_max_body_size', "{$nginxMb}M lebih kecil dari {$requiredMb}M yang diizinkan validator.");

        $postMb >= $requiredMb
            ? $this->ok('post_max_size', "{$postMb}M memenuhi kebutuhan {$requiredMb}M")
            : $this->bad('post_max_size', "{$postMb}M lebih kecil dari {$requiredMb}M yang diizinkan validator.");

        $uploadMb * 1024 >= $perImageKb
            ? $this->ok('upload_max_filesize', "{$uploadMb}M memenuhi batas satu berkas {$perImageKb}KB")
            : $this->bad('upload_max_filesize', "{$uploadMb}M lebih kecil dari batas satu berkas {$perImageKb}KB.");
    }

    private function megabytesFrom(string $haystack, string $pattern): int
    {
        if (preg_match($pattern, $haystack, $matches) !== 1) {
            return 0;
        }

        $value = (int) $matches[1];

        return strtolower($matches[2]) === 'k' ? (int) floor($value / 1024) : $value;
    }

    private function checkNginx(): void
    {
        $conf = $this->contents('docker/nginx/default.conf');

        if ($conf === '') {
            $this->bad('docker/nginx/default.conf', 'Berkas tidak dapat dibaca.');

            return;
        }

        /*
         * `add_header` tidak menimpa header dari upstream, ia menambah. Nilai
         * yang berbeda dari middleware SecurityHeaders akan terkirim dua kali
         * dan justru melemahkan proteksi.
         */
        $duplicated = array_values(array_filter(
            ['X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy'],
            static fn (string $header): bool => str_contains($conf, 'add_header '.$header),
        ));

        $duplicated === []
            ? $this->ok('Header Nginx', 'Tidak ada header dinamis yang digandakan dari aplikasi')
            : $this->bad('Header Nginx', 'Header berikut juga ditetapkan aplikasi dan akan terkirim ganda: '.implode(', ', $duplicated));

        str_contains($conf, 'location ~ /\\.')
            ? $this->ok('Berkas tersembunyi', 'Ditolak')
            : $this->bad('Berkas tersembunyi', 'Tidak ada aturan deny untuk path diawali titik.');

        preg_match('/location = \/build\/sw\.js \{(.*?)\}/s', $conf, $swBlock);
        str_contains($swBlock[1] ?? '', 'no-store')
            ? $this->ok('Cache service worker', 'no-store')
            : $this->bad('Cache service worker', 'sw.js harus memakai no-store agar pembaruan PWA sampai ke pengguna.');

        str_contains($conf, 'server_tokens off')
            ? $this->ok('server_tokens', 'off')
            : $this->bad('server_tokens', 'Versi Nginx akan diumumkan pada setiap respons.');
    }

    private function checkDockerfile(): void
    {
        $dockerfile = $this->contents('Dockerfile');

        foreach (['php-base', 'development', 'build', 'production', 'nginx-production'] as $stage) {
            if (! preg_match('/AS '.preg_quote($stage, '/').'\b/', $dockerfile)) {
                $this->bad('Stage Dockerfile', "Stage [{$stage}] tidak ditemukan.");

                return;
            }
        }

        $this->ok('Stage Dockerfile', 'Kelima stage tersedia');

        preg_match('/FROM php-base AS production(.*)$/s', $dockerfile, $productionStage);
        $production = $productionStage[1] ?? '';

        str_contains($production, 'APP_DEBUG=false') && str_contains($production, 'APP_ENV=production')
            ? $this->ok('Stage production', 'Menetapkan APP_ENV dan APP_DEBUG')
            : $this->bad('Stage production', 'Harus menetapkan APP_ENV=production dan APP_DEBUG=false.');

        str_contains($production, '--from=build')
            ? $this->ok('Aset production', 'Disalin dari stage build')
            : $this->bad('Aset production', 'Stage production tidak menyalin hasil build.');

        str_contains($this->contents('.dockerignore'), '.env')
            ? $this->ok('.dockerignore', 'Menahan .env agar tidak masuk image')
            : $this->bad('.dockerignore', '.env dapat ikut tersalin ke image.');
    }

    private function checkCompose(): void
    {
        $path = base_path('compose.yaml');

        if (! is_readable($path)) {
            $this->bad('compose.yaml', 'Berkas tidak dapat dibaca.');

            return;
        }

        /** @var array<string, mixed> $compose */
        $compose = Yaml::parseFile($path);
        $this->ok('compose.yaml', 'YAML valid dan dapat diurai');

        /** @var array<string, array<string, mixed>> $services */
        $services = $compose['services'] ?? [];
        $missing = array_diff(['app', 'web', 'queue', 'scheduler', 'mysql', 'redis'], array_keys($services));

        $missing === []
            ? $this->ok('Service compose', 'app, web, queue, scheduler, mysql, redis tersedia')
            : $this->bad('Service compose', 'Service berikut hilang: '.implode(', ', $missing));

        foreach (['mysql', 'redis'] as $name) {
            $ports = $services[$name]['ports'] ?? [];
            $exposedToWorld = array_filter(
                (array) $ports,
                static fn (mixed $port): bool => ! str_starts_with((string) $port, '127.0.0.1:'),
            );

            $exposedToWorld === []
                ? $this->ok("Port {$name}", 'Terbatas pada loopback host')
                : $this->bad("Port {$name}", 'Terbuka ke seluruh interface: '.implode(', ', array_map(strval(...), $exposedToWorld)));
        }

        foreach (['mysql', 'redis'] as $name) {
            isset($services[$name]['image']) && str_contains((string) $services[$name]['image'], ':')
                ? $this->ok("Image {$name}", (string) $services[$name]['image'])
                : $this->bad("Image {$name}", 'Image harus memakai tag eksplisit, bukan latest implisit.');
        }

        $appEnvironment = $compose['x-app-environment'] ?? [];
        array_key_exists('TRUSTED_PROXIES', (array) $appEnvironment)
            ? $this->ok('TRUSTED_PROXIES', 'Diteruskan ke container aplikasi')
            : $this->bad('TRUSTED_PROXIES', 'Service web menjadi proxy tetapi aplikasi tidak menerima daftar proxy tepercaya.');
    }
}

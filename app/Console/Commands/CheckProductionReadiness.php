<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Gerbang rilis untuk konfigurasi yang tidak dapat diuji PHPUnit karena
 * nilainya baru ada di server. Dijalankan sebagai release task sebelum traffic
 * dialihkan; keluar dengan kode selain nol agar deployment berhenti.
 */
class CheckProductionReadiness extends Command
{
    protected $signature = 'ecovillage:check-production
        {--allow-insecure-cookie : Izinkan SESSION_SECURE_COOKIE=false, hanya untuk uji coba di jaringan internal}';

    protected $description = 'Memeriksa konfigurasi wajib sebelum aplikasi menerima traffic production.';

    /** @var array<int, array{0: string, 1: string, 2: string}> */
    private array $rows = [];

    private bool $failed = false;

    public function handle(): int
    {
        // Container memakai instance command yang sama untuk pemanggilan
        // berikutnya dalam satu proses, jadi hasil sebelumnya harus dibuang.
        $this->rows = [];
        $this->failed = false;

        $this->checkApplication();
        $this->checkSession();
        $this->checkProxies();
        $this->checkMail();
        $this->checkSecrets();
        $this->checkDemoData();
        $this->checkStorage();
        $this->checkDatabase();

        $this->table(['Status', 'Pemeriksaan', 'Keterangan'], $this->rows);

        if ($this->failed) {
            $this->newLine();
            $this->error('Konfigurasi belum layak production. Perbaiki baris GAGAL di atas sebelum melanjutkan rilis.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Seluruh pemeriksaan konfigurasi production lulus.');

        return self::SUCCESS;
    }

    private function ok(string $check, string $detail): void
    {
        $this->rows[] = ['LULUS', $check, $detail];
    }

    private function attention(string $check, string $detail): void
    {
        $this->rows[] = ['PERIKSA', $check, $detail];
    }

    private function bad(string $check, string $detail): void
    {
        $this->rows[] = ['GAGAL', $check, $detail];
        $this->failed = true;
    }

    private function checkApplication(): void
    {
        app()->isProduction()
            ? $this->ok('APP_ENV', 'production')
            : $this->bad('APP_ENV', 'Bernilai ['.app()->environment().'], seharusnya [production].');

        config('app.debug')
            ? $this->bad('APP_DEBUG', 'Aktif. Stack trace dan nilai environment akan tampil kepada pengunjung.')
            : $this->ok('APP_DEBUG', 'Nonaktif');

        $key = (string) config('app.key');
        $key === ''
            ? $this->bad('APP_KEY', 'Kosong. Session dan seluruh nilai terenkripsi tidak dapat dibaca.')
            : $this->ok('APP_KEY', 'Terisi');

        $url = (string) config('app.url');
        str_starts_with($url, 'https://')
            ? $this->ok('APP_URL', $url)
            : $this->bad('APP_URL', "Bernilai [{$url}]; tautan verifikasi, setel ulang, dan signed URL akan memakai skema yang salah.");
    }

    private function checkSession(): void
    {
        if (config('session.secure') === true) {
            $this->ok('SESSION_SECURE_COOKIE', 'Aktif');
        } elseif ($this->option('allow-insecure-cookie')) {
            $this->attention('SESSION_SECURE_COOKIE', 'Nonaktif, dilewati atas permintaan eksplisit.');
        } else {
            $this->bad('SESSION_SECURE_COOKIE', 'Nonaktif. Cookie sesi akan ikut terkirim pada koneksi HTTP.');
        }

        config('session.http_only')
            ? $this->ok('SESSION_HTTP_ONLY', 'Aktif')
            : $this->bad('SESSION_HTTP_ONLY', 'Nonaktif. Cookie sesi dapat dibaca JavaScript.');

        in_array(config('session.same_site'), ['lax', 'strict'], true)
            ? $this->ok('SESSION_SAME_SITE', (string) config('session.same_site'))
            : $this->bad('SESSION_SAME_SITE', 'Harus [lax] atau [strict] agar cookie tidak ikut pada request lintas situs.');
    }

    private function checkProxies(): void
    {
        $proxies = trim((string) config('ecovillage.trusted_proxies'));

        $proxies === ''
            ? $this->attention('TRUSTED_PROXIES', 'Kosong. Benar hanya bila tidak ada reverse proxy; bila ada, HSTS hilang dan audit log menyimpan IP proxy.')
            : $this->ok('TRUSTED_PROXIES', $proxies);
    }

    private function checkMail(): void
    {
        $mailer = (string) config('mail.default');
        $verificationRequired = (bool) config('ecovillage.auth.email_verification_required');
        $deliversNothing = in_array($mailer, ['log', 'array'], true);

        if (! $deliversNothing) {
            $this->ok('MAIL_MAILER', $mailer);

            return;
        }

        $verificationRequired
            ? $this->bad('MAIL_MAILER', "Driver [{$mailer}] tidak mengirim email, sedangkan verifikasi email diwajibkan. Pengguna baru tidak akan pernah dapat masuk.")
            : $this->attention('MAIL_MAILER', "Driver [{$mailer}] tidak mengirim email. Setel ulang kata sandi hanya dapat ditolong manual lewat log.");
    }

    private function checkSecrets(): void
    {
        $suspects = [
            'DB_PASSWORD' => (string) config('database.connections.mysql.password'),
            'REDIS_PASSWORD' => (string) config('database.redis.default.password'),
            'DEMO_USER_PASSWORD' => (string) config('ecovillage.demo_password'),
        ];

        foreach ($suspects as $name => $value) {
            if (Str::contains($value, 'CHANGE_ME', ignoreCase: true)) {
                $this->bad($name, 'Masih memakai nilai penanda dari .env.example.');

                continue;
            }

            if ($name === 'DB_PASSWORD' && $value === '') {
                $this->bad($name, 'Kosong.');

                continue;
            }

            $this->ok($name, 'Terisi nilai non-penanda');
        }
    }

    private function checkDemoData(): void
    {
        config('ecovillage.demo_accounts_enabled')
            ? $this->bad('DEMO_ACCOUNTS_ENABLED', 'Aktif. Akun demo dengan kata sandi seragam tidak boleh ada di production.')
            : $this->ok('DEMO_ACCOUNTS_ENABLED', 'Nonaktif');
    }

    private function checkStorage(): void
    {
        $disk = (string) config('ecovillage.uploads.disk');

        try {
            $probe = 'healthcheck/'.Str::uuid()->toString();
            Storage::disk($disk)->put($probe, 'ok');
            Storage::disk($disk)->delete($probe);
            $this->ok('PRIVATE_UPLOAD_DISK', "Disk [{$disk}] dapat ditulis");
        } catch (Throwable $exception) {
            $this->bad('PRIVATE_UPLOAD_DISK', "Disk [{$disk}] tidak dapat ditulis: ".$exception->getMessage());
        }

        if ($disk === 'local' && app()->isProduction()) {
            $this->attention('PRIVATE_UPLOAD_DISK', 'Disk lokal bersifat ephemeral dan tidak dibagi antar-replica; pakai s3 untuk deployment multi-instance.');
        }
    }

    private function checkDatabase(): void
    {
        try {
            DB::connection()->getPdo();
            $this->ok('Koneksi database', (string) config('database.default'));
        } catch (Throwable $exception) {
            $this->bad('Koneksi database', $exception->getMessage());
        }

        try {
            $pending = collect(app('migrator')->getMigrationFiles(database_path('migrations')))
                ->keys()
                ->diff(app('migrator')->getRepository()->getRan())
                ->count();

            $pending === 0
                ? $this->ok('Migration', 'Seluruh migration sudah dijalankan')
                : $this->bad('Migration', "Masih ada {$pending} migration yang belum dijalankan.");
        } catch (Throwable $exception) {
            $this->bad('Migration', 'Status migration tidak dapat dibaca: '.$exception->getMessage());
        }
    }
}

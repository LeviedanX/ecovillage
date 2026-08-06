<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Berkas `.env` adalah satu-satunya petunjuk yang dimiliki orang yang melakukan
 * deployment. Bila ia menyimpang dari yang benar-benar dibaca aplikasi,
 * kesalahannya baru terlihat setelah aplikasi live.
 *
 * Berkas itu tidak ikut ke repositori, jadi pemeriksaan di sini dilewati bila
 * tidak ada — misalnya pada CI yang menyuntikkan environment lewat secret
 * manager.
 */
class EnvironmentTemplateTest extends TestCase
{
    /** @return array<string, string> */
    private function parse(string $file): array
    {
        $values = [];

        foreach (file(base_path($file), FILE_IGNORE_NEW_LINES) as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $values[trim($key)] = trim($value, " \"'");
        }

        return $values;
    }

    /** @return array<string, string> */
    private function environmentFile(string $file): array
    {
        if (! is_file(base_path($file))) {
            $this->markTestSkipped("Berkas {$file} tidak ada pada lingkungan ini.");
        }

        return $this->parse($file);
    }

    public function test_environment_file_is_shaped_for_production(): void
    {
        $env = $this->environmentFile('.env.production');

        $expected = [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'SESSION_SECURE_COOKIE' => 'true',
            'SESSION_HTTP_ONLY' => 'true',
            'SESSION_ENCRYPT' => 'true',
            'DEMO_ACCOUNTS_ENABLED' => 'false',
            'CSP_ENABLED' => 'true',
            'CSP_REPORT_ONLY' => 'false',
            'APP_TIMEZONE' => 'Asia/Jakarta',
            'APP_LOCALE' => 'id',
        ];

        foreach ($expected as $key => $value) {
            $this->assertSame($value, $env[$key] ?? null, "{$key} pada .env.production salah.");
        }

        $this->assertStringStartsWith('https://', $env['APP_URL'] ?? '');
    }

    /**
     * Nilai bertanda `ISI_` adalah penanda yang belum diisi. Sebagian boleh
     * tersisa sampai layanannya benar-benar dipakai, tetapi kunci aplikasi dan
     * kata sandi datastore harus sudah berupa nilai asli sebelum rilis.
     */
    public function test_core_secrets_are_filled_in(): void
    {
        $env = $this->environmentFile('.env.production');

        foreach (['APP_KEY', 'DB_PASSWORD', 'REDIS_PASSWORD'] as $key) {
            $value = $env[$key] ?? '';

            $this->assertTrue(
                $value !== ''
                    && ! str_starts_with($value, 'ISI_')
                    && ! str_contains($value, 'CHANGE_ME'),
                "{$key} masih kosong atau berupa penanda.",
            );
        }
    }

    /**
     * Setiap variabel yang dibaca `config/` harus muncul di kedua berkas, kalau
     * tidak orang yang melakukan deployment tidak punya cara mengetahui
     * variabel itu ada.
     */
    public function test_environment_files_cover_every_variable_the_config_reads(): void
    {
        $used = [];

        foreach (glob(config_path('*.php')) as $file) {
            preg_match_all("/env\(\s*'([A-Z0-9_]+)'/", (string) file_get_contents($file), $matches);
            $used = [...$used, ...$matches[1]];
        }

        $used = array_unique($used);

        // Variabel bawaan Laravel yang tidak relevan bagi deployment ini.
        $ignored = [
            'APP_MAINTENANCE_STORE', 'APP_PREVIOUS_KEYS', 'APP_CIPHER',
            'AUTH_GUARD', 'AUTH_MODEL', 'AUTH_PASSWORD_BROKER', 'AUTH_PASSWORD_RESET_TOKEN_TABLE',
            'AUTH_PASSWORD_TIMEOUT', 'DB_URL', 'DB_SOCKET', 'DB_CHARSET', 'DB_COLLATION',
            'DB_SSLMODE', 'DB_FOREIGN_KEYS', 'DB_QUEUE', 'DB_QUEUE_CONNECTION',
            'DB_QUEUE_TABLE', 'DB_QUEUE_RETRY_AFTER', 'DB_CACHE_TABLE', 'DB_CACHE_CONNECTION',
            'DB_CACHE_LOCK_TABLE', 'DB_CACHE_LOCK_CONNECTION', 'SESSION_TABLE',
            'SESSION_STORE', 'SESSION_COOKIE', 'SESSION_PARTITIONED_COOKIE',
            'MEMCACHED_HOST', 'MEMCACHED_PORT', 'MEMCACHED_USERNAME', 'MEMCACHED_PASSWORD',
            'MEMCACHED_PERSISTENT_ID', 'DYNAMODB_CACHE_TABLE', 'DYNAMODB_ENDPOINT',
            'REDIS_URL', 'REDIS_USERNAME', 'REDIS_PREFIX', 'REDIS_QUEUE', 'REDIS_QUEUE_CONNECTION',
            'REDIS_CLUSTER', 'REDIS_PERSISTENT', 'MAIL_URL', 'MAIL_EHLO_DOMAIN',
            'MAIL_SENDMAIL_PATH', 'MAIL_LOG_CHANNEL', 'POSTMARK_MESSAGE_STREAM_ID',
            'PAPERTRAIL_URL', 'PAPERTRAIL_PORT', 'LOG_SLACK_WEBHOOK_URL', 'LOG_DAILY_DAYS',
            'LOG_STDERR_FORMATTER', 'LOG_SYSLOG_FACILITY', 'LOG_LEVEL_DEPRECATIONS',
            'SQS_PREFIX', 'SQS_QUEUE', 'SQS_SUFFIX', 'AWS_SESSION_TOKEN',
            'PERMISSION_CACHE_EXPIRATION_TIME', 'PERMISSION_CACHE_KEY', 'PERMISSION_CACHE_STORE',
            'PASSKEYS_USER_HANDLE_SECRET',
            'RESEND_KEY', 'SLACK_BOT_USER_OAUTH_TOKEN', 'SLACK_BOT_USER_DEFAULT_CHANNEL',
            'POSTMARK_TOKEN', 'SCOUT_DRIVER', 'QUEUE_FAILED_DRIVER', 'NIGHTWATCH_ENABLED',
            'CACHE_STORAGE_DISK', 'CACHE_STORAGE_PATH', 'REDIS_CACHE_CONNECTION',
            'REDIS_CACHE_LOCK_CONNECTION', 'REDIS_MAX_RETRIES', 'REDIS_BACKOFF_ALGORITHM',
            'REDIS_BACKOFF_BASE', 'REDIS_BACKOFF_CAP', 'REDIS_QUEUE_RETRY_AFTER',
            'LOG_DEPRECATIONS_TRACE', 'LOG_SLACK_USERNAME', 'LOG_SLACK_EMOJI',
            'LOG_PAPERTRAIL_HANDLER', 'BEANSTALKD_QUEUE_HOST', 'BEANSTALKD_QUEUE',
            'BEANSTALKD_QUEUE_RETRY_AFTER', 'POSTMARK_API_KEY', 'RESEND_API_KEY',
            'SESSION_EXPIRE_ON_CLOSE',
            // Opsional dan bergantung penyedia; didokumentasikan sebagai baris
            // komentar pada `.env.production`.
            'MYSQL_ATTR_SSL_CA',
        ];

        $required = array_diff($used, $ignored);

        foreach (['.env', '.env.production'] as $file) {
            $missing = array_values(array_diff($required, array_keys($this->environmentFile($file))));

            $this->assertSame(
                [],
                $missing,
                "Variabel berikut dibaca config/ tetapi tidak ada di {$file}: ".implode(', ', $missing),
            );
        }
    }
}

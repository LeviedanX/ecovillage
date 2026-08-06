<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Menjalankan pemeriksaan konfigurasi deployment sebagai bagian dari suite,
 * sehingga ketidakcocokan antara Nginx, php.ini, Dockerfile, compose.yaml, dan
 * batas unggahan aplikasi tertangkap pada commit yang menyebabkannya.
 */
class DeployConfigTest extends TestCase
{
    public function test_deployment_configuration_is_internally_consistent(): void
    {
        $this->artisan('ecovillage:check-deploy-config')->assertSuccessful();
    }

    public function test_the_check_notices_an_upload_limit_that_exceeds_the_web_server(): void
    {
        // Menaikkan batas per gambar tanpa menaikkan batas Nginx dan PHP akan
        // menolak unggahan sebelum validasi berjalan.
        config()->set('ecovillage.uploads.max_image_kilobytes', 20480);

        $this->artisan('ecovillage:check-deploy-config')->assertFailed();
    }
}

<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Notifikasi bawaan Laravel dikirim di dalam request. Latensi SMTP karena itu
 * ditanggung pengguna yang sedang mendaftar, dan penyedia yang lambat membuat
 * halaman terasa menggantung tepat pada langkah pertama mereka.
 *
 * Versi ini masuk antrean; worker yang mengirimkannya. Pada koneksi `sync`,
 * misalnya saat pengujian, perilakunya tetap sama seperti sebelumnya.
 */
class QueuedVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use InteractsWithQueue;
}

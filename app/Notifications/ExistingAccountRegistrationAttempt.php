<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Dikirim ketika seseorang mencoba mendaftar memakai email yang sudah punya
 * akun. Halaman daftar menjawab dengan hasil yang sama seperti pendaftaran
 * baru, sehingga pemilik akun adalah satu-satunya pihak yang boleh mengetahui
 * bahwa alamat itu memang terdaftar.
 */
class ExistingAccountRegistrationAttempt extends Notification
{
    use Queueable;

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Percobaan pendaftaran dengan email Anda')
            ->greeting('Halo,')
            ->line('Seseorang baru saja mencoba membuat akun EcoVillage.id memakai alamat email ini. Alamat tersebut sudah terdaftar, sehingga tidak ada akun baru yang dibuat.')
            ->line('Bila itu Anda, cukup masuk memakai akun yang sudah ada.')
            ->action('Masuk ke akun Anda', route('login'))
            ->line('Bila Anda lupa kata sandi, gunakan tautan "Lupa kata sandi?" pada halaman masuk.')
            ->line('Bila bukan Anda, tidak ada tindakan yang perlu dilakukan. Akun Anda tidak berubah dan tidak ada data yang dibagikan kepada pengirim permintaan tersebut.');
    }
}

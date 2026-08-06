<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Sama seperti QueuedVerifyEmail: pengiriman dipindahkan ke worker agar
 * latensi penyedia email tidak menempel pada permintaan pengguna.
 */
class QueuedResetPassword extends ResetPassword implements ShouldQueue
{
    use InteractsWithQueue;
}

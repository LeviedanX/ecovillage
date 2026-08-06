<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Alur pokok warga adalah daftar lalu langsung dapat memakai aplikasi. Kedua
 * test di bawah menjaga alur itu tetap hidup pada deployment yang belum
 * memiliki layanan email.
 */
class RegistrationWithoutMailerTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, string> */
    private function payload(string $email = 'warga.baru@gmail.com'): array
    {
        return [
            'name' => 'Warga Baru',
            'email' => $email,
            'phone' => '081234567890',
            'password' => 'Kata-Sandi-Aman-2026',
            'password_confirmation' => 'Kata-Sandi-Aman-2026',
        ];
    }

    public function test_registration_reaches_the_dashboard_when_verification_is_disabled(): void
    {
        config()->set('ecovillage.auth.email_verification_required', false);

        $this->post(route('register.store'), $this->payload())
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();

        $user = User::query()->where('email', 'warga.baru@gmail.com')->sole();
        $this->assertTrue($user->hasVerifiedEmail());

        // Route aplikasi memakai middleware `verified`; tanpa penanganan flag
        // ini pengguna akan terlempar ke halaman verifikasi yang route-nya
        // bahkan tidak terdaftar.
        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_a_broken_mail_transport_does_not_fail_the_registration(): void
    {
        config()->set('ecovillage.auth.email_verification_required', true);
        // Port tertutup pada loopback menghasilkan kegagalan transport nyata
        // dan langsung, bukan tiruan yang mudah ikut berubah.
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.host', '127.0.0.1');
        config()->set('mail.mailers.smtp.port', 1);
        config()->set('mail.mailers.smtp.timeout', 1);

        Log::spy();

        $this->post(route('register.store'), $this->payload('warga.tanpa.email@gmail.com'))
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('users', ['email' => 'warga.tanpa.email@gmail.com']);
        Log::shouldHaveReceived('error')->once();
    }
}

<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\ExistingAccountRegistrationAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Halaman daftar tidak boleh dapat dipakai memeriksa apakah sebuah alamat
 * email memiliki akun. Pada platform yang menyimpan alamat rumah dan jadwal
 * pengambilan warga, daftar akun itu sendiri sudah merupakan data sensitif.
 */
class RegistrationEnumerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('ecovillage.auth.neutral_registration_response', true);
        config()->set('ecovillage.auth.email_verification_required', true);
    }

    private function register(string $email): TestResponse
    {
        return $this->post(route('register.store'), [
            'name' => 'Warga Uji',
            'email' => $email,
            'password' => 'Kata-Sandi-Aman-2026',
            'password_confirmation' => 'Kata-Sandi-Aman-2026',
        ]);
    }

    public function test_an_existing_and_a_new_address_produce_the_same_response(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'sudah.terdaftar@gmail.com']);

        $existing = $this->register('sudah.terdaftar@gmail.com');
        $fresh = $this->register('belum.terdaftar@gmail.com');

        foreach ([$existing, $fresh] as $response) {
            $response->assertSessionHasNoErrors();
            $response->assertRedirect(route('register.pending', absolute: false));
        }

        $this->assertSame($existing->getStatusCode(), $fresh->getStatusCode());

        // Sesi tidak boleh menjadi pembeda: cabang "sudah terdaftar" tidak
        // mungkin menerbitkan sesi, jadi cabang sukses pun tidak boleh.
        $this->assertGuest();
    }

    public function test_no_second_account_is_created_for_an_existing_address(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'sudah.terdaftar@gmail.com']);

        $this->register('sudah.terdaftar@gmail.com')->assertSessionHasNoErrors();

        $this->assertSame(1, User::query()->where('email', 'sudah.terdaftar@gmail.com')->count());
    }

    public function test_the_account_owner_is_the_only_party_told(): void
    {
        Notification::fake();
        $owner = User::factory()->create(['email' => 'sudah.terdaftar@gmail.com']);

        $this->register('sudah.terdaftar@gmail.com');

        Notification::assertSentTo($owner, ExistingAccountRegistrationAttempt::class);
    }

    public function test_a_new_address_still_creates_a_usable_account(): void
    {
        Notification::fake();

        $this->register('warga.baru@gmail.com')->assertRedirect(route('register.pending', absolute: false));

        $user = User::query()->where('email', 'warga.baru@gmail.com')->sole();

        $this->assertTrue($user->hasRole('warga'));
        $this->assertNotNull($user->pointAccount);
        $this->assertNotNull($user->profile);
    }

    public function test_format_errors_are_still_reported(): void
    {
        // Netral bukan berarti diam: kesalahan yang tidak membocorkan apa pun
        // tentang akun lain tetap harus sampai ke pengguna.
        $this->register('bukan-gmail@example.com')->assertSessionHasErrors('email');

        $this->post(route('register.store'), [
            'name' => 'Warga Uji',
            'email' => 'warga.baru@gmail.com',
            'password' => 'pendek',
            'password_confirmation' => 'berbeda',
        ])->assertSessionHasErrors('password');
    }

    public function test_registration_is_rate_limited(): void
    {
        Notification::fake();

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->register("percobaan{$attempt}@gmail.com");
        }

        $this->register('percobaan6@gmail.com')->assertStatus(429);
    }

    public function test_without_a_mailer_the_plain_flow_is_used_instead(): void
    {
        config()->set('ecovillage.auth.email_verification_required', false);

        $this->register('warga.baru@gmail.com')
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();
    }
}

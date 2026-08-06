<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Locale aplikasi dan fallback-nya sama-sama `id`. Bila berkas terjemahan
 * hilang, seluruh pesan framework tampil sebagai key mentah seperti
 * "validation.required" di setiap formulir. Test ini menahan regresi itu.
 */
class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_validation_messages_are_translated(): void
    {
        $validator = Validator::make(
            ['name' => '', 'email' => 'bukan-email'],
            ['name' => ['required'], 'email' => ['required', 'email']],
        );

        foreach ($validator->errors()->all() as $message) {
            $this->assertStringNotContainsString('validation.', $message);
        }

        $this->assertSame('Kolom nama wajib diisi.', $validator->errors()->first('name'));
    }

    public function test_auth_and_password_broker_messages_are_translated(): void
    {
        foreach (['auth.failed', 'auth.password', 'auth.throttle'] as $key) {
            $this->assertNotSame($key, trans($key));
        }

        foreach (['passwords.reset', 'passwords.sent', 'passwords.throttled', 'passwords.token', 'passwords.user'] as $key) {
            $this->assertNotSame($key, trans($key));
        }
    }

    public function test_failed_login_returns_a_translated_message(): void
    {
        $user = User::factory()->create();

        $response = $this->from(route('login'))->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'kata-sandi-salah',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertStringNotContainsString(
            'auth.',
            (string) session('errors')->getBag('default')->first('email'),
        );
    }
}

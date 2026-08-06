<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Pendaftaran memakai App\Http\Controllers\Auth\RegistrationController, bukan
 * route bawaan Fortify. Perilaku anti-enumerasinya diuji terpisah pada
 * RegistrationEnumerationTest.
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $this->get(route('register'))->assertOk();
    }

    public function test_new_users_can_register(): void
    {
        Notification::fake();

        $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@gmail.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('register.pending', absolute: false));

        $user = User::query()->where('email', 'test@gmail.com')->sole();

        $this->assertDatabaseHas('point_accounts', [
            'user_id' => $user->id,
            'balance' => 0,
        ]);
    }

    public function test_registration_rejects_non_gmail_email_address(): void
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_registration_screen_is_closed_to_signed_in_users(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('register'))
            ->assertRedirect();
    }
}

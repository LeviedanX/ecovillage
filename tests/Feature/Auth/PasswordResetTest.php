<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_screen_can_be_rendered(): void
    {
        $this->get(route('password.request'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('auth/forgot-password'));
    }

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHasNoErrors();

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_unknown_email_does_not_reveal_account_existence(): void
    {
        Notification::fake();

        $this->post(route('password.email'), ['email' => 'tidak-terdaftar@example.invalid'])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status');

        Notification::assertNothingSent();
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $this->get(route('password.reset', ['token' => $notification->token]).'?email='.urlencode($user->email))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('auth/reset-password')
                    ->where('email', $user->email)
                    ->where('token', $notification->token),
                );

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $this->post(route('password.update'), [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'kata-sandi-baru-2026',
                'password_confirmation' => 'kata-sandi-baru-2026',
            ])->assertSessionHasNoErrors();

            $this->assertTrue(Hash::check('kata-sandi-baru-2026', $user->fresh()->password));

            return true;
        });
    }

    public function test_reset_is_rejected_for_an_invalid_token(): void
    {
        $user = User::factory()->create(['password' => Hash::make('kata-sandi-lama-2026')]);

        $this->post(route('password.update'), [
            'token' => 'token-palsu',
            'email' => $user->email,
            'password' => 'kata-sandi-baru-2026',
            'password_confirmation' => 'kata-sandi-baru-2026',
        ])->assertSessionHasErrors('email');

        $this->assertTrue(Hash::check('kata-sandi-lama-2026', $user->fresh()->password));
    }

    public function test_authenticated_user_is_redirected_away_from_reset_screens(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('password.request'))->assertRedirect();
    }
}

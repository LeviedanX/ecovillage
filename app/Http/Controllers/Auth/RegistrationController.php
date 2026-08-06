<?php

namespace App\Http\Controllers\Auth;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ExistingAccountRegistrationAttempt;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rules\Unique;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Pendaftaran ditangani sendiri, bukan oleh Fortify, karena aturan `unique`
 * pada email membuat halaman daftar menjawab berbeda untuk alamat yang sudah
 * terdaftar. Perbedaan itu cukup untuk memetakan siapa saja yang memiliki akun
 * pada platform data warga.
 *
 * Dalam mode netral, kedua kemungkinan berakhir pada halaman dan pesan yang
 * sama; hanya pemilik alamat yang menerima pemberitahuan melalui email.
 */
class RegistrationController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function create(): Response
    {
        return Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function store(Request $request, CreatesNewUsers $creator): RedirectResponse
    {
        if (config('fortify.lowercase_usernames') && $request->has('email')) {
            $request->merge(['email' => Str::lower((string) $request->input('email'))]);
        }

        if (! $this->respondsNeutrally()) {
            // Tanpa mailer, pemberitahuan kepada pemilik akun tidak akan
            // sampai dan pendaftar hanya menerima halaman buntu. Perilaku
            // biasa, termasuk pesan "email sudah dipakai", lebih menolong.
            $user = $creator->create($request->all());
            event(new Registered($user));
            Auth::guard(config('fortify.guard'))->login($user);
            $request->session()->regenerate();

            return to_route('dashboard');
        }

        $validated = Validator::make($request->all(), [
            ...$this->profileRulesWithoutUniqueness(),
            'password' => $this->passwordRules(),
        ], $this->profileValidationMessages())->validate();

        $existing = User::query()->where('email', $validated['email'])->first();

        if ($existing !== null) {
            $existing->notify(new ExistingAccountRegistrationAttempt);

            return to_route('register.pending');
        }

        event(new Registered($creator->create($request->all())));

        /*
         * Sengaja tidak melakukan login otomatis. Cabang "email sudah
         * terdaftar" tidak mungkin menerbitkan sesi, jadi login di sini akan
         * membuat kedua cabang dapat dibedakan hanya dari ada tidaknya cookie.
         */
        return to_route('register.pending');
    }

    public function pending(): Response
    {
        return Inertia::render('auth/register-pending');
    }

    /**
     * Mode netral hanya masuk akal ketika email benar-benar terkirim: pesan
     * "periksa email Anda" tanpa mailer adalah jalan buntu bagi pendaftar.
     */
    private function respondsNeutrally(): bool
    {
        return (bool) config('ecovillage.auth.neutral_registration_response')
            && (bool) config('ecovillage.auth.email_verification_required');
    }

    /**
     * Aturan profil tanpa `unique`. Keberadaan akun diperiksa terpisah agar
     * tidak menjadi pesan kesalahan pada formulir.
     *
     * @return array<string, array<int, mixed>>
     */
    private function profileRulesWithoutUniqueness(): array
    {
        $rules = $this->profileRules();
        $rules['email'] = array_values(array_filter(
            $rules['email'],
            static fn (mixed $rule): bool => ! $rule instanceof Unique,
        ));

        return $rules;
    }
}

<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse as FailedPasswordResetLinkRequestResponseContract;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\Http\Responses\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Http\Responses\SuccessfulPasswordResetLinkRequestResponse;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
        $this->configurePasswordResetPrivacy();
    }

    /**
     * Permintaan tautan setel ulang selalu dijawab dengan hasil yang sama,
     * baik email terdaftar maupun tidak. Respons bawaan Fortify menandai
     * email tidak dikenal sebagai error validasi, sehingga halaman lupa
     * kata sandi dapat dipakai memetakan akun warga yang benar-benar ada.
     * Status lain, misalnya throttle, tetap tampil apa adanya.
     */
    private function configurePasswordResetPrivacy(): void
    {
        $this->app->bind(
            FailedPasswordResetLinkRequestResponseContract::class,
            function ($app, array $parameters) {
                $status = (string) ($parameters['status'] ?? PasswordBroker::INVALID_USER);

                return $status === PasswordBroker::INVALID_USER
                    ? new SuccessfulPasswordResetLinkRequestResponse(PasswordBroker::RESET_LINK_SENT)
                    : new FailedPasswordResetLinkRequestResponse($status);
            },
        );
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'token' => (string) $request->route('token'),
            'email' => (string) $request->string('email'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        /*
         * Batas menyeluruh untuk lapisan web. Tanpa ini, hanya endpoint
         * tertentu yang terlindungi, sementara halaman publik seperti peta
         * yang menjalankan query agregasi dapat dihajar terus-menerus dengan
         * satu skrip sederhana.
         *
         * Ambangnya sengaja longgar: pengguna sungguhan, termasuk beberapa
         * warga di balik satu sambungan kantor desa, tidak akan menyentuhnya.
         * Kunci memakai id pengguna bila sudah masuk, agar satu IP bersama
         * tidak membuat mereka saling menjatuhkan.
         */
        RateLimiter::for('web', function (Request $request) {
            return Limit::perMinute(240)->by(
                $request->user()?->getAuthIdentifier() ?? $request->ip(),
            );
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}

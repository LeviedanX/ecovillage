<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Role;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ], $this->profileValidationMessages())->validate();

        return DB::transaction(function () use ($input): User {
            $user = User::query()->create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
            ]);

            // Tanpa verifikasi email, akun tidak boleh dibiarkan tanpa
            // `email_verified_at`: kolom itu adalah penanda akun yang siap
            // dipakai, baik oleh middleware maupun pelaporan.
            if (! config('ecovillage.auth.email_verification_required')) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $user->profile()->create(['preferred_locale' => 'id']);
            $user->pointAccount()->create(['balance' => 0]);
            $user->assignRole(Role::findOrCreate(RoleName::Citizen->value, 'web'));

            return $user;
        });
    }
}

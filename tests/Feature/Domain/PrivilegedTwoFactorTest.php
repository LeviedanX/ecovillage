<?php

namespace Tests\Feature\Domain;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Super admin dan pengelola dapat membuka alamat rumah serta koordinat tepat
 * warga. Test ini menjaga agar kewenangan itu tidak pernah bergantung pada
 * kata sandi saja.
 */
class PrivilegedTwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        config()->set('ecovillage.auth.require_two_factor_for_privileged', true);
    }

    private function user(RoleName $role, bool $withTwoFactor = false): User
    {
        $user = User::factory()->create($withTwoFactor ? [
            'two_factor_secret' => encrypt('rahasia-uji'),
            'two_factor_confirmed_at' => now(),
        ] : []);
        $user->assignRole($role->value);

        return $user;
    }

    public function test_privileged_roles_without_two_factor_are_kept_out_of_management(): void
    {
        foreach ([RoleName::SuperAdmin, RoleName::ProgramManager] as $role) {
            $this->actingAs($this->user($role))
                ->get(route('admin.master-data.index'))
                ->assertRedirect(route('security.edit'));
        }
    }

    public function test_privileged_roles_with_two_factor_pass_through(): void
    {
        $this->actingAs($this->user(RoleName::SuperAdmin, withTwoFactor: true))
            ->get(route('admin.master-data.index'))
            ->assertOk();
    }

    public function test_operational_routes_are_guarded_too(): void
    {
        $this->actingAs($this->user(RoleName::ProgramManager))
            ->get(route('operations.collections.index'))
            ->assertRedirect(route('security.edit'));
    }

    public function test_citizens_and_officers_are_not_forced_into_two_factor(): void
    {
        // Kader hanya melihat tugas yang ditugaskan kepadanya; mewajibkan 2FA
        // di sini akan menghambat pemakaian lapangan tanpa manfaat setara.
        $officer = $this->user(RoleName::Officer);

        $this->actingAs($officer)
            ->get(route('operations.collections.index'))
            ->assertOk();
    }

    public function test_the_requirement_can_be_switched_off_for_demo_environments(): void
    {
        config()->set('ecovillage.auth.require_two_factor_for_privileged', false);

        $this->actingAs($this->user(RoleName::SuperAdmin))
            ->get(route('admin.master-data.index'))
            ->assertOk();
    }

    public function test_privileged_user_is_never_locked_out_of_security_settings(): void
    {
        // Kalau halaman ini ikut tertutup middleware 2FA, pengguna terkunci
        // total dan tidak punya cara memasang faktor kedua yang diminta.
        // Yang menghadangnya hanyalah konfirmasi kata sandi bawaan, dan
        // setelah dikonfirmasi halaman terbuka.
        $user = $this->user(RoleName::SuperAdmin);

        $this->actingAs($user)
            ->get(route('security.edit'))
            ->assertRedirect(route('password.confirm'));

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->get(route('security.edit'))
            ->assertOk();
    }

    public function test_the_dashboard_stays_open_so_the_redirect_never_loops(): void
    {
        $this->actingAs($this->user(RoleName::SuperAdmin))
            ->get(route('dashboard'))
            ->assertOk();
    }
}

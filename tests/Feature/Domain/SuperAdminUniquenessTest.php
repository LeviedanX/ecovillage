<?php

namespace Tests\Feature\Domain;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminUniquenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_cannot_promote_a_second_super_admin(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = $this->userWithRole(RoleName::SuperAdmin);
        $citizen = $this->userWithRole(RoleName::Citizen);

        $this->actingAs($admin)
            ->patch(route('admin.users.role', $citizen), ['role' => RoleName::SuperAdmin->value])
            ->assertSessionHasErrors('role');

        $citizen->refresh();
        $this->assertTrue($citizen->hasRole(RoleName::Citizen->value));
        $this->assertSame(1, User::role(RoleName::SuperAdmin->value)->count());
    }

    public function test_reassigning_super_admin_to_the_incumbent_stays_allowed(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = $this->userWithRole(RoleName::SuperAdmin);

        $this->actingAs($admin)
            ->patch(route('admin.users.role', $admin), ['role' => RoleName::SuperAdmin->value])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, User::role(RoleName::SuperAdmin->value)->count());
    }

    public function test_manager_cannot_change_roles(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $manager = $this->userWithRole(RoleName::ProgramManager);
        $citizen = $this->userWithRole(RoleName::Citizen);

        $this->actingAs($manager)
            ->patch(route('admin.users.role', $citizen), ['role' => RoleName::Officer->value])
            ->assertForbidden();

        $citizen->refresh();
        $this->assertTrue($citizen->hasRole(RoleName::Citizen->value));
    }

    public function test_manager_cannot_promote_anyone_to_super_admin(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $manager = $this->userWithRole(RoleName::ProgramManager);
        $citizen = $this->userWithRole(RoleName::Citizen);

        $this->actingAs($manager)
            ->patch(route('admin.users.role', $citizen), ['role' => RoleName::SuperAdmin->value])
            ->assertForbidden();

        $this->assertSame(0, User::role(RoleName::SuperAdmin->value)->count());
    }

    public function test_promotion_is_possible_only_after_the_incumbent_is_demoted(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = $this->userWithRole(RoleName::SuperAdmin);
        $successor = $this->userWithRole(RoleName::ProgramManager);

        $this->actingAs($admin)
            ->patch(route('admin.users.role', $successor), ['role' => RoleName::SuperAdmin->value])
            ->assertSessionHasErrors('role');

        $this->actingAs($admin)
            ->patch(route('admin.users.role', $admin), ['role' => RoleName::ProgramManager->value])
            ->assertSessionHasErrors('role');

        $this->assertSame(1, User::role(RoleName::SuperAdmin->value)->count());
        $this->assertTrue($admin->fresh()->hasRole(RoleName::SuperAdmin->value));
    }

    private function userWithRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        return $user;
    }
}

<?php

namespace Tests\Feature\Domain;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleJobdescAuditTest extends TestCase
{
    use RefreshDatabase;

    /** Permission administratif yang menjadi monopoli super admin. */
    private const ADMIN_ONLY = [
        'users.manage',
        'roles.manage',
        'regions.manage',
        'waste.manage',
        'factors.manage',
        'settings.manage',
        'audit.view',
    ];

    public function test_only_super_admin_holds_every_permission(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $all = Permission::query()->pluck('name')->sort()->values()->all();

        $superAdmin = Role::findByName(RoleName::SuperAdmin->value, 'web');
        $this->assertSame($all, $superAdmin->permissions()->pluck('name')->sort()->values()->all());

        foreach ([RoleName::Citizen, RoleName::Officer, RoleName::ProgramManager] as $role) {
            $held = Role::findByName($role->value, 'web')->permissions()->pluck('name')->sort()->values()->all();
            $this->assertNotSame($all, $held, "Role {$role->value} tidak boleh memegang seluruh permission.");
            $this->assertNotEmpty(array_diff($all, $held));
        }
    }

    public function test_administrative_permissions_belong_to_super_admin_only(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach ([RoleName::Citizen, RoleName::Officer, RoleName::ProgramManager] as $role) {
            $held = Role::findByName($role->value, 'web')->permissions()->pluck('name')->all();

            foreach (self::ADMIN_ONLY as $permission) {
                $this->assertNotContains(
                    $permission,
                    $held,
                    "Role {$role->value} tidak boleh memegang {$permission}.",
                );
            }
        }
    }

    public function test_every_role_can_manage_its_own_points_and_redemption(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (RoleName::cases() as $role) {
            $user = User::factory()->create();
            $user->assignRole($role->value);

            $this->assertTrue($user->can('points.view-own'), "Role {$role->value} harus bisa melihat poinnya sendiri.");
            $this->assertTrue($user->can('redemptions.create'), "Role {$role->value} harus bisa menukar poinnya sendiri.");
        }
    }

    public function test_only_citizen_and_super_admin_may_create_collection_requests(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $this->assertTrue(Role::findByName(RoleName::Citizen->value, 'web')->hasPermissionTo('collections.create'));
        $this->assertTrue(Role::findByName(RoleName::SuperAdmin->value, 'web')->hasPermissionTo('collections.create'));
        $this->assertFalse(Role::findByName(RoleName::Officer->value, 'web')->hasPermissionTo('collections.create'));
        $this->assertFalse(Role::findByName(RoleName::ProgramManager->value, 'web')->hasPermissionTo('collections.create'));
    }

    public function test_operational_scope_permissions_do_not_overlap_between_roles(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $officer = Role::findByName(RoleName::Officer->value, 'web');
        $manager = Role::findByName(RoleName::ProgramManager->value, 'web');

        // Kader bekerja per penugasan, pengelola per wilayah. Keduanya tidak
        // boleh saling meminjam cakupan.
        $this->assertTrue($officer->hasPermissionTo('collections.view-assigned'));
        $this->assertFalse($officer->hasPermissionTo('collections.view-region'));
        $this->assertTrue($officer->hasPermissionTo('map.view-exact-assigned'));
        $this->assertFalse($officer->hasPermissionTo('map.view-exact-region'));

        $this->assertTrue($manager->hasPermissionTo('collections.view-region'));
        $this->assertFalse($manager->hasPermissionTo('collections.process'));
        $this->assertTrue($manager->hasPermissionTo('map.view-exact-region'));
        $this->assertFalse($manager->hasPermissionTo('map.view-exact-assigned'));
    }

    public function test_hazardous_verification_is_never_granted_by_default(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach ([RoleName::Citizen, RoleName::Officer, RoleName::ProgramManager] as $role) {
            $this->assertFalse(
                Role::findByName($role->value, 'web')->hasPermissionTo('collections.verify-hazardous'),
                "Verifikasi B3 tidak boleh melekat otomatis pada role {$role->value}.",
            );
        }
    }

    public function test_last_super_admin_cannot_delete_own_account(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);

        $this->actingAs($admin)
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors('password');

        $admin->refresh();
        $this->assertNull($admin->anonymized_at);
        $this->assertTrue($admin->hasRole(RoleName::SuperAdmin->value));
        $this->assertSame(1, User::role(RoleName::SuperAdmin->value)->count());
    }

    public function test_non_super_admin_can_still_delete_own_account(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);
        $citizen = User::factory()->create();
        $citizen->assignRole(RoleName::Citizen->value);

        $this->actingAs($citizen)
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasNoErrors();

        $citizen->refresh();
        $this->assertNotNull($citizen->anonymized_at);
        $this->assertEmpty($citizen->getRoleNames()->all());
        $this->assertSame(1, User::role(RoleName::SuperAdmin->value)->count());
    }
}

<?php

namespace Tests\Feature\Domain;

use App\Enums\RoleName;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Ketiga endpoint AdminAccessController sebelumnya hanya dapat dipanggil
 * dengan merakit request sendiri: tidak ada halaman yang memakainya. Test ini
 * menjaga agar panel kewenangan tetap dapat dipakai dari aplikasi dan tetap
 * tertutup bagi role yang tidak berhak.
 */
class AccessManagementUiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::SuperAdmin->value);

        return $user;
    }

    private function region(): Region
    {
        return Region::query()->create([
            'parent_id' => null,
            'level' => 'village',
            'name' => 'Desa Uji',
            'slug' => 'desa-uji',
            'code' => 'UJI-01',
            'is_active' => true,
        ]);
    }

    public function test_the_access_panel_renders_for_a_super_admin(): void
    {
        $this->actingAs($this->superAdmin())
            ->get(route('admin.access.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/access')
                ->where('abilities.manageUsers', true)
                ->where('abilities.manageRoles', true)
                ->where('abilities.manageRegionAssignments', true)
                ->has('users')
                ->has('roles')
                ->has('permissions')
                ->has('regions'),
            );
    }

    public function test_the_access_panel_is_closed_to_citizens_and_officers(): void
    {
        foreach ([RoleName::Citizen, RoleName::Officer] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role->value);

            $this->actingAs($user)
                ->get(route('admin.access.index'))
                ->assertForbidden();
        }
    }

    public function test_a_manager_without_user_permissions_cannot_open_the_panel(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole(RoleName::ProgramManager->value);

        // Pengelola tidak memegang users.manage maupun roles.manage secara baku.
        $this->actingAs($manager)
            ->get(route('admin.access.index'))
            ->assertForbidden();
    }

    public function test_region_assignment_can_be_created_and_deactivated_from_the_panel(): void
    {
        $admin = $this->superAdmin();
        $region = $this->region();

        $officer = User::factory()->create();
        $officer->assignRole(RoleName::Officer->value);

        $this->actingAs($admin)
            ->post(route('admin.users.region-assignments.store', $officer), [
                'region_id' => $region->id,
                'assignment_type' => RoleName::Officer->value,
            ])
            ->assertSessionHasNoErrors();

        $assignment = RegionUserAssignment::query()->sole();
        $this->assertTrue($assignment->is_active);

        $this->actingAs($admin)
            ->patch(route('admin.region-assignments.update', $assignment), ['is_active' => false])
            ->assertSessionHasNoErrors();

        $this->assertFalse($assignment->fresh()->is_active);

        // Panel harus menampilkan penugasan itu supaya dapat diaktifkan lagi.
        // Urutan daftar mengikuti nama, jadi barisnya dicari, bukan ditebak.
        $this->actingAs($admin)
            ->get(route('admin.access.index'))
            ->assertInertia(function (Assert $page) use ($officer): void {
                $row = collect($page->toArray()['props']['users'])
                    ->firstWhere('id', $officer->id);

                $this->assertNotNull($row, 'Petugas tidak muncul pada panel akses.');
                $this->assertSame('Desa Uji', $row['assignments'][0]['region']);
                $this->assertFalse($row['assignments'][0]['is_active']);
            });
    }

    public function test_role_permissions_can_be_synced_from_the_panel(): void
    {
        $admin = $this->superAdmin();
        $role = Role::findByName(RoleName::Officer->value, 'web');

        $this->actingAs($admin)
            ->patch(route('admin.roles.permissions.update', $role), [
                'permissions' => ['collections.view-assigned', 'forum.access'],
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(
            ['collections.view-assigned', 'forum.access'],
            $role->fresh()->permissions->pluck('name')->sort()->values()->all(),
        );
    }

    public function test_super_admin_permissions_stay_fixed(): void
    {
        $admin = $this->superAdmin();
        $role = Role::findByName(RoleName::SuperAdmin->value, 'web');
        $before = $role->permissions()->count();

        $this->actingAs($admin)
            ->patch(route('admin.roles.permissions.update', $role), ['permissions' => []])
            ->assertSessionHasErrors('role');

        $this->assertSame($before, $role->fresh()->permissions()->count());
    }

    public function test_the_panel_marks_the_super_admin_role_as_locked(): void
    {
        $this->actingAs($this->superAdmin())
            ->get(route('admin.access.index'))
            ->assertInertia(function (Assert $page): void {
                $roles = collect($page->toArray()['props']['roles']);
                $superAdmin = $roles->firstWhere('name', RoleName::SuperAdmin->value);

                $this->assertNotNull($superAdmin);
                $this->assertTrue($superAdmin['locked']);
                $this->assertFalse(
                    $roles->firstWhere('name', RoleName::Officer->value)['locked'],
                );
            });
    }
}

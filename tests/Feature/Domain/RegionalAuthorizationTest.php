<?php

namespace Tests\Feature\Domain;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class RegionalAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_cannot_view_or_verify_collection_from_another_region(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $regionA = Region::query()->create([
            'level' => RegionLevel::Rw, 'code' => 'RW-A', 'name' => 'RW A', 'slug' => 'rw-a',
        ]);
        $regionB = Region::query()->create([
            'level' => RegionLevel::Rw, 'code' => 'RW-B', 'name' => 'RW B', 'slug' => 'rw-b',
        ]);
        $manager = User::factory()->create();
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $regionA->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $regionA->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);
        $citizen = User::factory()->create();
        $request = CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $regionB->id,
            'request_number' => 'EV-CROSS-REGION',
            'address_snapshot' => ['address_line' => 'Alamat sintetis B'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Weighed,
        ]);

        $this->assertFalse(Gate::forUser($manager)->allows('view', $request));
        $this->assertFalse(Gate::forUser($manager)->allows('verify', $request));
    }

    public function test_manager_assignment_covers_descendants_but_not_parent_or_sibling_regions(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $village = Region::query()->create([
            'level' => RegionLevel::Village, 'code' => 'V-1', 'name' => 'Kelurahan Test', 'slug' => 'kelurahan-test',
        ]);
        $rwA = Region::query()->create([
            'parent_id' => $village->id, 'level' => RegionLevel::Rw, 'code' => 'RW-A', 'name' => 'RW A', 'slug' => 'rw-a',
        ]);
        $rwB = Region::query()->create([
            'parent_id' => $village->id, 'level' => RegionLevel::Rw, 'code' => 'RW-B', 'name' => 'RW B', 'slug' => 'rw-b',
        ]);
        $rtA = Region::query()->create([
            'parent_id' => $rwA->id, 'level' => RegionLevel::Rt, 'code' => 'RT-A', 'name' => 'RT A', 'slug' => 'rt-a',
        ]);
        $manager = User::factory()->create();
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $rwA->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $rwA->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);

        $this->assertTrue($manager->canAccessRegion($rwA));
        $this->assertTrue($manager->canAccessRegion($rtA));
        $this->assertFalse($manager->canAccessRegion($village));
        $this->assertFalse($manager->canAccessRegion($rwB));
        $this->assertEqualsCanonicalizing([$rwA->id, $rtA->id], $manager->accessibleRegionIds()->all());
    }
}

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
use App\Models\WasteCategory;
use App\Models\WasteType;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OfficerAssignmentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_officer_sees_and_processes_only_active_assignments_with_valid_state_history(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $region = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-OFFICER',
            'name' => 'RW Penugasan Kader',
            'slug' => 'rw-penugasan-kader',
        ]);
        $manager = $this->staff($region, RoleName::ProgramManager, 'Pengelola Penugas');
        $officer = $this->staff($region, RoleName::Officer, 'Kader Ditugaskan');
        $otherOfficer = $this->staff($region, RoleName::Officer, 'Kader Lain');
        $citizen = $this->citizen($region);

        $category = WasteCategory::query()->create(['name' => 'Organik Kader', 'slug' => 'organik-kader']);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Daun Kader',
            'slug' => 'daun-kader',
        ]);

        $assigned = $this->assignedCollection($citizen, $region, $wasteType, $officer, $manager, 'EV-OFFICER-OWN');
        $notAssigned = $this->assignedCollection($citizen, $region, $wasteType, $otherOfficer, $manager, 'EV-OFFICER-OTHER');

        $this->actingAs($officer)
            ->get(route('operations.collections.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('collections/index')
                ->has('collections.data', 1)
                ->where('collections.data.0.id', $assigned->id)
                ->where('mode', 'operations'));

        $this->actingAs($officer)
            ->patch(route('operations.collections.picked-up', $notAssigned), ['notes' => 'Bukan tugas kader ini.'])
            ->assertForbidden();
        $this->assertSame(CollectionStatus::Assigned, $notAssigned->fresh()->status);

        $this->actingAs($officer)
            ->patch(route('operations.collections.picked-up', $assigned), ['notes' => 'Sampah telah diambil kader.'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(CollectionStatus::PickedUp, $assigned->fresh()->status);
        $this->assertDatabaseHas('collection_status_histories', [
            'collection_request_id' => $assigned->id,
            'from_status' => CollectionStatus::Assigned->value,
            'to_status' => CollectionStatus::PickedUp->value,
            'actor_id' => $officer->id,
        ]);

        $item = $assigned->items()->sole();
        $this->actingAs($officer)
            ->patch(route('operations.collections.weigh', $assigned), [
                'weights' => [$item->id => '2.375'],
                'notes' => 'Berat ditimbang pada timbangan uji.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(CollectionStatus::Weighed, $assigned->fresh()->status);
        $this->assertDatabaseHas('collection_items', [
            'id' => $item->id,
            'verified_weight' => 2.375,
            'verified_by' => $officer->id,
        ]);
        $this->assertDatabaseHas('collection_status_histories', [
            'collection_request_id' => $assigned->id,
            'from_status' => CollectionStatus::PickedUp->value,
            'to_status' => CollectionStatus::Weighed->value,
            'actor_id' => $officer->id,
        ]);
    }

    private function staff(Region $region, RoleName $role, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole($role->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'assignment_type' => $role->value,
        ]);

        return $user;
    }

    private function citizen(Region $region): User
    {
        $user = User::factory()->create(['name' => 'Warga Pemilik Permintaan']);
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);

        return $user;
    }

    private function assignedCollection(
        User $citizen,
        Region $region,
        WasteType $wasteType,
        User $assignee,
        User $manager,
        string $number,
    ): CollectionRequest {
        $collection = CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $region->id,
            'request_number' => $number,
            'address_snapshot' => ['address_line' => 'Alamat sintetis penugasan'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Assigned,
            'desired_at' => now()->addDay(),
            'submitted_at' => now(),
        ]);
        $collection->items()->create([
            'waste_type_id' => $wasteType->id,
            'estimated_weight' => '2.000',
        ]);
        $collection->assignments()->create([
            'assignee_id' => $assignee->id,
            'assigned_by' => $manager->id,
            'assigned_at' => now(),
            'is_active' => true,
        ]);

        return $collection;
    }
}

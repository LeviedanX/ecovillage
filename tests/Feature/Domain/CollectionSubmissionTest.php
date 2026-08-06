<?php

namespace Tests\Feature\Domain;

use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\Address;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WasteCategory;
use App\Models\WasteType;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_collection_region_is_derived_from_owned_address_not_client_input(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = Region::query()->create([
            'level' => RegionLevel::Rt, 'code' => 'RT-OWN', 'name' => 'RT Sendiri', 'slug' => 'rt-sendiri',
        ]);
        $otherRegion = Region::query()->create([
            'level' => RegionLevel::Rt, 'code' => 'RT-OTHER', 'name' => 'RT Lain', 'slug' => 'rt-lain',
        ]);
        $user = User::factory()->create();
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);
        $address = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat sintetis',
            'is_primary' => true,
        ]);
        $category = WasteCategory::query()->create(['name' => 'Organik', 'slug' => 'organik-submission']);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Daun',
            'slug' => 'daun-submission',
        ]);

        $response = $this->actingAs($user)->post(route('collections.store'), [
            'region_id' => $otherRegion->id,
            'address_id' => $address->id,
            'method' => 'pickup',
            'desired_at' => now()->addDay()->toDateTimeString(),
            'latitude' => '-7.9817000',
            'longitude' => '112.6718000',
            'location_consent' => true,
            'items' => [['waste_type_id' => $wasteType->id, 'estimated_weight' => '1.250']],
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect();
        $this->assertDatabaseHas('collection_requests', [
            'requester_id' => $user->id,
            'address_id' => $address->id,
            'region_id' => $region->id,
        ]);
        $this->assertDatabaseMissing('collection_requests', ['region_id' => $otherRegion->id]);
    }

    public function test_hazardous_waste_is_rejected_when_no_authorized_partner_is_configured(): void
    {
        config()->set('ecovillage.hazardous_waste.partner_configured', false);
        $this->seed(RolePermissionSeeder::class);
        $region = Region::query()->create([
            'level' => RegionLevel::Rt, 'code' => 'RT-B3', 'name' => 'RT B3', 'slug' => 'rt-b3',
        ]);
        $user = User::factory()->create();
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);
        $address = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat sintetis B3',
        ]);
        $category = WasteCategory::query()->create([
            'name' => 'B3 Rumah Tangga', 'slug' => 'b3-submission', 'is_hazardous' => true,
        ]);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Baterai',
            'slug' => 'baterai-submission',
        ]);

        $response = $this->actingAs($user)->post(route('collections.store'), [
            'address_id' => $address->id,
            'method' => 'drop_off',
            'desired_at' => now()->addDay()->toDateTimeString(),
            'latitude' => '-7.9821000',
            'longitude' => '112.6722000',
            'location_consent' => true,
            'items' => [['waste_type_id' => $wasteType->id, 'estimated_weight' => '0.500']],
        ]);

        $response->assertSessionHasErrors('items');
        $this->assertDatabaseCount('collection_requests', 0);
    }

    public function test_hazardous_waste_stores_a_structured_partner_referral_snapshot(): void
    {
        config()->set('ecovillage.hazardous_waste', [
            'partner_configured' => true,
            'contact_name' => 'Mitra B3 Sintetis',
            'contact_url' => 'https://example.test/mitra-b3',
        ]);
        $this->seed(RolePermissionSeeder::class);
        $region = Region::query()->create([
            'level' => RegionLevel::Rt, 'code' => 'RT-B3-PARTNER', 'name' => 'RT B3 Partner', 'slug' => 'rt-b3-partner',
        ]);
        $user = User::factory()->create();
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);
        $address = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat sintetis rujukan B3',
        ]);
        $category = WasteCategory::query()->create([
            'name' => 'B3 Sintetis', 'slug' => 'b3-partner-submission', 'is_hazardous' => true,
        ]);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Lampu bekas',
            'slug' => 'lampu-bekas-submission',
        ]);

        $this->actingAs($user)->post(route('collections.store'), [
            'address_id' => $address->id,
            'method' => 'pickup',
            'desired_at' => now()->addDay()->toDateTimeString(),
            'items' => [['waste_type_id' => $wasteType->id, 'estimated_weight' => '0.250']],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $collection = CollectionRequest::query()->sole();
        $this->assertTrue($collection->contains_hazardous);
        $this->assertSame('referred', $collection->hazardous_handling_status);
        $this->assertSame('Mitra B3 Sintetis', $collection->hazardous_partner_snapshot['contact_name']);
        $this->assertSame('https://example.test/mitra-b3', $collection->hazardous_partner_snapshot['contact_url']);
    }
}

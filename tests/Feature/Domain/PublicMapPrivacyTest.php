<?php

namespace Tests\Feature\Domain;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\RegionLevel;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\User;
use App\Models\WasteCategory;
use App\Models\WasteType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicMapPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_map_uses_rounded_region_aggregates_and_applies_threshold_after_category_filter(): void
    {
        config()->set('ecovillage.map.public_minimum_records', 3);
        config()->set('ecovillage.map.public_coordinate_precision', 2);

        $regionA = $this->region('A', '-7.9876543', '112.6789123');
        $regionB = $this->region('B', '-7.9123456', '112.6123456');
        $citizen = User::factory()->create(['name' => 'Warga Data Peta']);
        $organicCategory = WasteCategory::query()->create(['name' => 'Organik Peta', 'slug' => 'organik-peta']);
        $otherCategory = WasteCategory::query()->create(['name' => 'Anorganik Peta', 'slug' => 'anorganik-peta']);
        $organic = WasteType::query()->create([
            'waste_category_id' => $organicCategory->id,
            'name' => 'Daun Peta',
            'slug' => 'daun-peta',
        ]);
        $other = WasteType::query()->create([
            'waste_category_id' => $otherCategory->id,
            'name' => 'Botol Peta',
            'slug' => 'botol-peta',
        ]);

        foreach (['1.000', '2.000', '3.000'] as $index => $weight) {
            $this->completedCollection($citizen, $regionA, $organic, "EV-MAP-A-ORG-{$index}", $weight, '-7.9812345', '112.6712345');
        }
        $this->completedCollection($citizen, $regionA, $other, 'EV-MAP-A-OTHER', '4.000', '-7.9823456', '112.6723456');

        foreach (['1.500', '2.500'] as $index => $weight) {
            $this->completedCollection($citizen, $regionB, $organic, "EV-MAP-B-ORG-{$index}", $weight, '-7.9111111', '112.6111111');
        }
        foreach (['3.500', '4.500'] as $index => $weight) {
            $this->completedCollection($citizen, $regionB, $other, "EV-MAP-B-OTHER-{$index}", $weight, '-7.9222222', '112.6222222');
        }

        $unfiltered = $this->get(route('public.map'))->assertOk();
        $unfilteredPoints = collect($unfiltered->inertiaProps('points'));
        $this->assertCount(2, $unfilteredPoints);
        $pointA = $unfilteredPoints->firstWhere('region_name', $regionA->name);
        $this->assertSame(-7.99, $pointA['latitude']);
        $this->assertSame(112.68, $pointA['longitude']);
        $this->assertSame(4, $pointA['request_count']);
        $this->assertArrayNotHasKey('id', $pointA);
        $this->assertArrayNotHasKey('address_snapshot', $pointA);
        $this->assertNotSame(-7.9812345, $pointA['latitude']);
        $this->assertNotSame(112.6712345, $pointA['longitude']);

        $filtered = $this->get(route('public.map', ['category' => 'organik-peta']))->assertOk();
        $filteredPoints = collect($filtered->inertiaProps('points'));

        $this->assertCount(1, $filteredPoints, 'Wilayah dengan hanya dua rekaman kategori terpilih harus disembunyikan walaupun total semua kategorinya empat.');
        $filteredA = $filteredPoints->sole();
        $this->assertSame($regionA->name, $filteredA['region_name']);
        $this->assertSame(3, $filteredA['request_count']);
        $this->assertSame(6.0, (float) $filteredA['weight_kg']);
        $this->assertSame('organik-peta', $filteredA['category']);
        $this->assertSame(1, $filtered->inertiaProps('summary.locations'));
        $this->assertSame(6.0, (float) $filtered->inertiaProps('summary.verified_weight_kg'));
    }

    private function region(string $suffix, string $latitude, string $longitude): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => "RW-MAP-{$suffix}",
            'name' => "RW Peta {$suffix}",
            'slug' => strtolower("rw-peta-{$suffix}"),
            'centroid_latitude' => $latitude,
            'centroid_longitude' => $longitude,
        ]);
    }

    private function completedCollection(
        User $citizen,
        Region $region,
        WasteType $wasteType,
        string $number,
        string $weight,
        string $latitude,
        string $longitude,
    ): CollectionRequest {
        $collection = CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $region->id,
            'request_number' => $number,
            'address_snapshot' => ['address_line' => 'Koordinat rumah rahasia'],
            'latitude' => $latitude,
            'longitude' => $longitude,
            'location_consent_at' => now(),
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Completed,
            'submitted_at' => now()->subDay(),
            'completed_at' => now(),
        ]);
        $collection->items()->create([
            'waste_type_id' => $wasteType->id,
            'estimated_weight' => $weight,
            'verified_weight' => $weight,
        ]);

        return $collection;
    }
}

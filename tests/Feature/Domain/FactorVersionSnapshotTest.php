<?php

namespace Tests\Feature\Domain;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\FactorSetStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\EnvironmentalFactor;
use App\Models\EnvironmentalFactorSet;
use App\Models\PointRule;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WasteCategory;
use App\Models\WasteType;
use App\Services\CollectionVerificationService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class FactorVersionSnapshotTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_factor_version_does_not_recalculate_or_mutate_old_snapshot(): void
    {
        $this->travelTo(Carbon::parse('2026-08-03 08:00:00', 'Asia/Jakarta'));
        $this->seed(RolePermissionSeeder::class);

        $region = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-FACTOR',
            'name' => 'RW Versi Faktor',
            'slug' => 'rw-versi-faktor',
        ]);
        $manager = User::factory()->create(['name' => 'Pengelola Faktor']);
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $region->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $region->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);
        $officer = User::factory()->create(['name' => 'Kader Penimbang Faktor']);
        $citizen = User::factory()->create(['name' => 'Warga Faktor']);
        UserProfile::query()->create(['user_id' => $citizen->id, 'primary_region_id' => $region->id]);

        $category = WasteCategory::query()->create(['name' => 'Kertas Faktor', 'slug' => 'kertas-faktor']);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Kardus Faktor',
            'slug' => 'kardus-faktor',
        ]);
        PointRule::query()->create([
            'waste_type_id' => $wasteType->id,
            'version' => 1,
            'points_per_kg' => '2.0000',
            'effective_from' => now()->subDay(),
        ]);

        $versionOne = $this->factorSet($wasteType, 1, '0.50000000', now()->subDay());
        $versionTwo = $this->factorSet($wasteType, 2, '5.00000000', now()->addHour());
        $firstRequest = $this->weighedRequest($citizen, $officer, $region, $wasteType, 'EV-FACTOR-V1');

        $firstResult = app(CollectionVerificationService::class)->verify($firstRequest, $manager);
        $firstCalculation = $firstResult->impactCalculation;
        $firstItemSnapshot = $firstCalculation->items()->sole()->factor_snapshot;

        $this->assertSame($versionOne->id, $firstCalculation->environmental_factor_set_id);
        $this->assertSame(1, $firstCalculation->methodology_snapshot['version']);
        $this->assertSame('0.50000000', $firstItemSnapshot['carbon_kg_co2e']);
        $this->assertSame('1.000000', $firstCalculation->total_carbon_kg_co2e);

        $this->travelTo(Carbon::parse('2026-08-03 10:00:00', 'Asia/Jakarta'));
        $secondRequest = $this->weighedRequest($citizen, $officer, $region, $wasteType, 'EV-FACTOR-V2');
        $secondResult = app(CollectionVerificationService::class)->verify($secondRequest, $manager);
        $secondCalculation = $secondResult->impactCalculation;

        $this->assertSame($versionTwo->id, $secondCalculation->environmental_factor_set_id);
        $this->assertSame(2, $secondCalculation->methodology_snapshot['version']);
        $this->assertSame('5.00000000', $secondCalculation->items()->sole()->factor_snapshot['carbon_kg_co2e']);
        $this->assertSame('10.000000', $secondCalculation->total_carbon_kg_co2e);

        EnvironmentalFactor::query()
            ->where('environmental_factor_set_id', $versionOne->id)
            ->where('impact_kind', EnvironmentalFactor::CARBON)
            ->update(['factor_value' => '9.99999999']);

        $immutableFirst = $firstCalculation->fresh('items');
        $this->assertSame($versionOne->id, $immutableFirst->environmental_factor_set_id);
        $this->assertSame(1, $immutableFirst->methodology_snapshot['version']);
        $this->assertSame('0.50000000', $immutableFirst->items->sole()->factor_snapshot['carbon_kg_co2e']);
        $this->assertSame('1.000000', $immutableFirst->total_carbon_kg_co2e);
    }

    private function factorSet(WasteType $wasteType, int $version, string $carbon, mixed $effectiveFrom): EnvironmentalFactorSet
    {
        $set = EnvironmentalFactorSet::query()->create([
            'name' => 'Metodologi Sintetis Berversi',
            'version' => $version,
            'source_name' => "Sumber sintetis versi {$version}",
            'effective_from' => $effectiveFrom,
            'status' => FactorSetStatus::Active,
            'is_demo' => true,
        ]);

        foreach ([
            EnvironmentalFactor::CARBON => [$carbon, 'kg CO2e/kg'],
            EnvironmentalFactor::RECYCLABLE => ['0.25000000', 'kg/kg'],
            EnvironmentalFactor::ENERGY => ['1.00000000', 'kWh/kg'],
        ] as $kind => [$value, $unit]) {
            EnvironmentalFactor::query()->create([
                'environmental_factor_set_id' => $set->id,
                'waste_type_id' => $wasteType->id,
                'impact_kind' => $kind,
                'factor_value' => $value,
                'unit' => $unit,
            ]);
        }

        return $set;
    }

    private function weighedRequest(
        User $citizen,
        User $officer,
        Region $region,
        WasteType $wasteType,
        string $number,
    ): CollectionRequest {
        $request = CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $region->id,
            'request_number' => $number,
            'address_snapshot' => ['address_line' => 'Alamat sintetis faktor'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Weighed,
            'submitted_at' => now()->subHour(),
        ]);
        $request->items()->create([
            'waste_type_id' => $wasteType->id,
            'estimated_weight' => '2.000',
            'verified_weight' => '2.000',
            'verified_by' => $officer->id,
            'verified_at' => now()->subMinute(),
        ]);

        return $request;
    }
}

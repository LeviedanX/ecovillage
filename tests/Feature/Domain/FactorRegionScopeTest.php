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
use Tests\TestCase;

class FactorRegionScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_verification_prefers_most_specific_region_factor_and_falls_back_to_ancestor(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $rw = $this->region(null, RegionLevel::Rw, 'RW-SCOPE');
        $rtA = $this->region($rw, RegionLevel::Rt, 'RT-SCOPE-A');
        $rtB = $this->region($rw, RegionLevel::Rt, 'RT-SCOPE-B');
        $manager = $this->manager($rw);
        $officer = User::factory()->create(['name' => 'Kader Faktor Wilayah']);
        $citizen = User::factory()->create(['name' => 'Warga Faktor Wilayah']);
        $category = WasteCategory::query()->create(['name' => 'Kategori Scope', 'slug' => 'kategori-scope']);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Jenis Scope',
            'slug' => 'jenis-scope',
        ]);
        PointRule::query()->create([
            'waste_type_id' => $wasteType->id,
            'version' => 1,
            'points_per_kg' => '1.0000',
            'effective_from' => now()->subDay(),
        ]);

        $global = $this->factorSet($wasteType, null, 'Global sintetis', '0.10000000');
        $rwSet = $this->factorSet($wasteType, $rw, 'RW sintetis', '0.50000000');
        $rtSet = $this->factorSet($wasteType, $rtA, 'RT sintetis', '0.90000000');

        $atRtA = $this->weighedRequest($citizen, $officer, $rtA, $wasteType, 'EV-SCOPE-A');
        $atRtB = $this->weighedRequest($citizen, $officer, $rtB, $wasteType, 'EV-SCOPE-B');
        $service = app(CollectionVerificationService::class);

        $calculationA = $service->verify($atRtA, $manager)->impactCalculation;
        $calculationB = $service->verify($atRtB, $manager)->impactCalculation;

        $this->assertSame($rtSet->id, $calculationA->environmental_factor_set_id);
        $this->assertSame('region', $calculationA->methodology_snapshot['scope']['type']);
        $this->assertSame($rtA->id, $calculationA->methodology_snapshot['scope']['region_id']);
        $this->assertSame('1.800000', $calculationA->total_carbon_kg_co2e);

        $this->assertSame($rwSet->id, $calculationB->environmental_factor_set_id);
        $this->assertSame($rw->id, $calculationB->methodology_snapshot['scope']['region_id']);
        $this->assertSame('1.000000', $calculationB->total_carbon_kg_co2e);
        $this->assertNotSame($global->id, $calculationB->environmental_factor_set_id);
    }

    private function region(?Region $parent, RegionLevel $level, string $code): Region
    {
        return Region::query()->create([
            'parent_id' => $parent?->id,
            'level' => $level,
            'code' => $code,
            'name' => str_replace('-', ' ', $code),
            'slug' => strtolower($code),
        ]);
    }

    private function manager(Region $region): User
    {
        $manager = User::factory()->create(['name' => 'Pengelola Faktor Wilayah']);
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $region->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $region->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);

        return $manager;
    }

    private function factorSet(
        WasteType $wasteType,
        ?Region $region,
        string $name,
        string $carbon,
    ): EnvironmentalFactorSet {
        $set = EnvironmentalFactorSet::query()->create([
            'region_id' => $region?->id,
            'name' => $name,
            'version' => 1,
            'source_name' => 'Sumber sintetis pengujian',
            'effective_from' => now()->subDay(),
            'scope_notes' => $region === null ? 'Global' : "Wilayah {$region->name}",
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
            'address_snapshot' => ['address_line' => 'Alamat sintetis factor scope'],
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

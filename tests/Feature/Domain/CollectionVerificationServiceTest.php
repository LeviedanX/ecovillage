<?php

namespace Tests\Feature\Domain;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\FactorSetStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\CollectionItem;
use App\Models\CollectionRequest;
use App\Models\EnvironmentalFactor;
use App\Models\EnvironmentalFactorSet;
use App\Models\ImpactCalculation;
use App\Models\PointAccount;
use App\Models\PointRule;
use App\Models\PointTransaction;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WasteCategory;
use App\Models\WasteType;
use App\Services\CollectionVerificationService;
use Database\Seeders\RolePermissionSeeder;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionVerificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_verification_creates_immutable_impact_and_point_ledger_once(): void
    {
        $fixture = $this->makeFixture();
        $service = app(CollectionVerificationService::class);

        $result = $service->verify(
            $fixture['request'],
            $fixture['manager'],
            [$fixture['item']->id => 4.000],
        );

        $this->assertSame(CollectionStatus::Completed, $result->status);
        $this->assertSame($fixture['officer']->id, $fixture['item']->fresh()->verified_by);
        $this->assertDatabaseHas('point_accounts', [
            'user_id' => $fixture['citizen']->id,
            'balance' => 8,
        ]);
        $this->assertDatabaseHas('point_transactions', [
            'user_id' => $fixture['citizen']->id,
            'amount' => 8,
            'balance_before' => 0,
            'balance_after' => 8,
            'idempotency_key' => 'collection-verification:'.$fixture['request']->id,
        ]);
        $this->assertDatabaseHas('impact_calculations', [
            'collection_request_id' => $fixture['request']->id,
            'environmental_factor_set_id' => $fixture['factor_set']->id,
            'total_verified_weight' => 4,
            'total_carbon_kg_co2e' => 2,
            'total_recyclable_kg' => 1,
            'total_energy_kwh' => 4,
        ]);
        $this->assertDatabaseHas('collection_status_histories', [
            'collection_request_id' => $fixture['request']->id,
            'from_status' => CollectionStatus::Weighed->value,
            'to_status' => CollectionStatus::Verified->value,
        ]);
        $this->assertDatabaseHas('collection_status_histories', [
            'collection_request_id' => $fixture['request']->id,
            'from_status' => CollectionStatus::Verified->value,
            'to_status' => CollectionStatus::Completed->value,
        ]);
        $this->assertSame(1, AuditLog::query()->where('event', 'collection.verified')->count());

        $service->verify($result, $fixture['manager']);

        $this->assertSame(1, ImpactCalculation::query()->count());
        $this->assertSame(1, PointTransaction::query()->count());
        $this->assertSame(8, $fixture['citizen']->pointAccount()->value('balance'));
        $this->assertSame(1, AuditLog::query()->where('event', 'collection.verified')->count());
    }

    public function test_verification_rejects_payload_that_differs_from_officer_weighing(): void
    {
        $fixture = $this->makeFixture();

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('berbeda dari hasil penimbangan');

        try {
            app(CollectionVerificationService::class)->verify(
                $fixture['request'],
                $fixture['manager'],
                [$fixture['item']->id => 5.000],
            );
        } finally {
            $this->assertDatabaseCount('impact_calculations', 0);
            $this->assertDatabaseCount('point_transactions', 0);
            $this->assertSame(0, $fixture['citizen']->pointAccount()->value('balance'));
            $this->assertSame(CollectionStatus::Weighed, $fixture['request']->fresh()->status);
        }
    }

    public function test_verification_decimal_golden_values_follow_database_scales_without_float_drift(): void
    {
        $fixture = $this->makeFixture();
        $factorValues = [
            EnvironmentalFactor::CARBON => '0.12345678',
            EnvironmentalFactor::RECYCLABLE => '0.33333333',
            EnvironmentalFactor::ENERGY => '1.23456789',
        ];

        foreach ($factorValues as $kind => $value) {
            EnvironmentalFactor::query()
                ->where('environmental_factor_set_id', $fixture['factor_set']->id)
                ->where('waste_type_id', $fixture['item']->waste_type_id)
                ->where('impact_kind', $kind)
                ->update(['factor_value' => $value]);
        }

        PointRule::query()
            ->where('waste_type_id', $fixture['item']->waste_type_id)
            ->update(['points_per_kg' => '2.5000']);
        $fixture['item']->update(['verified_weight' => '0.333']);

        $result = app(CollectionVerificationService::class)->verify(
            $fixture['request'],
            $fixture['manager'],
            [$fixture['item']->id => '0.333'],
        );

        $calculation = $result->impactCalculation;
        $calculationItem = $calculation->items->sole();

        $this->assertSame('0.333', $calculation->total_verified_weight);
        $this->assertSame('0.041111', $calculation->total_carbon_kg_co2e);
        $this->assertSame('0.111000', $calculation->total_recyclable_kg);
        $this->assertSame('0.411111', $calculation->total_energy_kwh);
        $this->assertSame('0.041111', $calculationItem->carbon_kg_co2e);
        $this->assertSame('0.111000', $calculationItem->recyclable_kg);
        $this->assertSame('0.411111', $calculationItem->energy_kwh);
        $this->assertSame('0.12345678', $calculationItem->factor_snapshot['carbon_kg_co2e']);
        $this->assertSame('0.33333333', $calculationItem->factor_snapshot['recyclable_kg']);
        $this->assertSame('1.23456789', $calculationItem->factor_snapshot['energy_kwh']);
        $this->assertSame('2.5000', $calculationItem->factor_snapshot['points_per_kg']);
        $this->assertSame(1, $fixture['citizen']->pointAccount()->value('balance'));
    }

    public function test_verification_rejects_payload_beyond_weight_column_scale(): void
    {
        $fixture = $this->makeFixture();

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('berbeda dari hasil penimbangan');

        try {
            app(CollectionVerificationService::class)->verify(
                $fixture['request'],
                $fixture['manager'],
                [$fixture['item']->id => '4.0001'],
            );
        } finally {
            $this->assertDatabaseCount('impact_calculations', 0);
            $this->assertDatabaseCount('point_transactions', 0);
            $this->assertSame(CollectionStatus::Weighed, $fixture['request']->fresh()->status);
        }
    }

    /**
     * @return array{
     *     manager: User,
     *     officer: User,
     *     citizen: User,
     *     request: CollectionRequest,
     *     item: CollectionItem,
     *     factor_set: EnvironmentalFactorSet
     * }
     */
    private function makeFixture(): array
    {
        $this->seed(RolePermissionSeeder::class);

        $region = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-TEST',
            'name' => 'RW Test',
            'slug' => 'rw-test',
        ]);
        $manager = User::factory()->create();
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $region->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $region->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);
        $officer = User::factory()->create();
        $citizen = User::factory()->create();
        UserProfile::query()->create(['user_id' => $citizen->id, 'primary_region_id' => $region->id]);
        PointAccount::query()->create(['user_id' => $citizen->id, 'balance' => 0]);

        $category = WasteCategory::query()->create([
            'name' => 'Organik Test', 'slug' => 'organik-test',
        ]);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Daun Test',
            'slug' => 'daun-test',
        ]);
        PointRule::query()->create([
            'waste_type_id' => $wasteType->id,
            'version' => 1,
            'points_per_kg' => 2,
            'effective_from' => now()->subDay(),
        ]);
        $factorSet = EnvironmentalFactorSet::query()->create([
            'name' => 'Demo Test',
            'version' => 7,
            'source_name' => 'Synthetic Test',
            'effective_from' => now()->subDay(),
            'status' => FactorSetStatus::Active,
            'is_demo' => true,
        ]);
        foreach ([
            [EnvironmentalFactor::CARBON, 0.5, 'kg CO2e/kg'],
            [EnvironmentalFactor::RECYCLABLE, 0.25, 'kg/kg'],
            [EnvironmentalFactor::ENERGY, 1.0, 'kWh/kg'],
        ] as [$kind, $value, $unit]) {
            EnvironmentalFactor::query()->create([
                'environmental_factor_set_id' => $factorSet->id,
                'waste_type_id' => $wasteType->id,
                'impact_kind' => $kind,
                'factor_value' => $value,
                'unit' => $unit,
            ]);
        }

        $request = CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $region->id,
            'request_number' => 'EV-TEST-VERIFY',
            'address_snapshot' => ['address_line' => 'Alamat sintetis'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Weighed,
            'submitted_at' => now()->subDay(),
        ]);
        $item = $request->items()->create([
            'waste_type_id' => $wasteType->id,
            'estimated_weight' => 3.5,
            'verified_weight' => 4,
            'verified_by' => $officer->id,
            'verified_at' => now()->subMinute(),
        ]);

        return [
            'manager' => $manager,
            'officer' => $officer,
            'citizen' => $citizen,
            'request' => $request,
            'item' => $item,
            'factor_set' => $factorSet,
        ];
    }
}

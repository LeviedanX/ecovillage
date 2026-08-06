<?php

namespace Tests\Feature\Domain;

use App\Enums\PointTransactionType;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\PointAccount;
use App\Models\PointTransaction;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointLedgerAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_adjustment_is_idempotent_and_reversal_is_append_only(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-LEDGER',
            'name' => 'RW Ledger',
            'slug' => 'rw-ledger',
        ]);
        $manager = User::factory()->create(['name' => 'Pengelola Ledger']);
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $region->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $region->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);

        $citizen = User::factory()->create(['name' => 'Warga Target Ledger']);
        $citizen->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $citizen->id, 'primary_region_id' => $region->id]);
        $account = PointAccount::query()->create(['user_id' => $citizen->id, 'balance' => 100]);

        $payload = [
            'amount' => 25,
            'reason' => 'Koreksi hasil audit bukti timbang warga.',
            'idempotency_key' => 'adjust-ledger-001',
        ];
        $this->actingAs($manager)
            ->post(route('admin.points.adjust', $citizen), $payload)
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $adjustment = PointTransaction::query()->sole();
        $this->assertSame(PointTransactionType::Adjustment, $adjustment->type);
        $this->assertSame(25, $adjustment->amount);
        $this->assertSame(100, $adjustment->balance_before);
        $this->assertSame(125, $adjustment->balance_after);
        $this->assertSame(125, $account->fresh()->balance);

        $this->actingAs($manager)
            ->post(route('admin.points.adjust', $citizen), $payload)
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertDatabaseCount('point_transactions', 1);
        $this->assertSame(125, $account->fresh()->balance);

        $this->actingAs($manager)
            ->post(route('admin.points.reverse', $adjustment), [
                'reason' => 'Reversal karena koreksi audit dibatalkan.',
                'idempotency_key' => 'reverse-ledger-001',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $reversal = PointTransaction::query()->where('type', PointTransactionType::Reversal)->sole();
        $this->assertSame(-25, $reversal->amount);
        $this->assertSame(125, $reversal->balance_before);
        $this->assertSame(100, $reversal->balance_after);
        $this->assertSame($adjustment->getMorphClass(), $reversal->reference_type);
        $this->assertSame($adjustment->id, $reversal->reference_id);
        $this->assertSame(100, $account->fresh()->balance);
        $this->assertDatabaseCount('point_transactions', 2);
        $this->assertDatabaseHas('audit_logs', ['event' => 'points.adjustment', 'actor_id' => $manager->id]);
        $this->assertDatabaseHas('audit_logs', ['event' => 'points.reversal', 'actor_id' => $manager->id]);

        $this->actingAs($manager)
            ->post(route('admin.points.reverse', $adjustment), [
                'reason' => 'Reversal karena koreksi audit dibatalkan.',
                'idempotency_key' => 'reverse-ledger-001',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertDatabaseCount('point_transactions', 2);
        $this->assertSame(
            'points-reversal:'.hash('sha256', 'reverse-ledger-001'),
            $reversal->idempotency_key,
        );

        $this->actingAs($manager)
            ->post(route('admin.points.reverse', $adjustment), [
                'reason' => 'Percobaan reversal kedua harus ditolak.',
                'idempotency_key' => 'reverse-ledger-002',
            ])
            ->assertSessionHasErrors('reversal');
        $this->assertDatabaseCount('point_transactions', 2);
        $this->assertSame(100, $account->fresh()->balance);
    }
}

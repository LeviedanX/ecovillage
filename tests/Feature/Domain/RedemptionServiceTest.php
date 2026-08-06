<?php

namespace Tests\Feature\Domain;

use App\Enums\RedemptionStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\PointAccount;
use App\Models\PointTransaction;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Redemption;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\RedemptionService;
use Database\Seeders\RolePermissionSeeder;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedemptionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_redemption_debits_points_and_stock_atomically_and_is_idempotent(): void
    {
        [$user, $account, $product] = $this->makeFixture(balance: 1000, stock: 3, price: 200);
        $service = app(RedemptionService::class);

        $redemption = $service->redeem($user, [$product->id => 2], 'redeem-test-001');

        $this->assertSame(400, $redemption->total_points);
        $this->assertSame(600, $account->fresh()->balance);
        $this->assertSame(1, $product->fresh()->stock);
        $this->assertDatabaseHas('point_transactions', [
            'user_id' => $user->id,
            'amount' => -400,
            'balance_before' => 1000,
            'balance_after' => 600,
            'idempotency_key' => 'redemption:redeem-test-001',
        ]);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'quantity' => -2,
            'stock_before' => 3,
            'stock_after' => 1,
        ]);
        $this->assertSame(1, AuditLog::query()->where('event', 'redemption.created')->count());

        $sameRedemption = $service->redeem($user, [$product->id => 2], 'redeem-test-001');

        $this->assertSame($redemption->id, $sameRedemption->id);
        $this->assertSame(1, Redemption::query()->count());
        $this->assertSame(1, PointTransaction::query()->count());
        $this->assertSame(600, $account->fresh()->balance);
        $this->assertSame(1, $product->fresh()->stock);
    }

    public function test_failed_redemption_rolls_back_balance_stock_and_ledger(): void
    {
        [$user, $account, $product] = $this->makeFixture(balance: 1000, stock: 1, price: 200);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Stok');

        try {
            app(RedemptionService::class)->redeem($user, [$product->id => 2], 'redeem-test-stock-fail');
        } finally {
            $this->assertDatabaseCount('redemptions', 0);
            $this->assertDatabaseCount('point_transactions', 0);
            $this->assertSame(1000, $account->fresh()->balance);
            $this->assertSame(1, $product->fresh()->stock);
        }
    }

    public function test_insufficient_point_balance_rolls_back_redemption_and_inventory(): void
    {
        [$user, $account, $product] = $this->makeFixture(balance: 150, stock: 5, price: 200);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Saldo Green Points tidak mencukupi');

        try {
            app(RedemptionService::class)->redeem($user, [$product->id => 1], 'redeem-test-balance-fail');
        } finally {
            $this->assertDatabaseCount('redemptions', 0);
            $this->assertDatabaseCount('redemption_items', 0);
            $this->assertDatabaseCount('point_transactions', 0);
            $this->assertDatabaseCount('inventory_movements', 0);
            $this->assertSame(150, $account->fresh()->balance);
            $this->assertSame(5, $product->fresh()->stock);
        }
    }

    public function test_cancellation_restores_points_and_stock_once_through_reversal(): void
    {
        [$user, $account, $product] = $this->makeFixture(balance: 1000, stock: 3, price: 200);
        $admin = User::factory()->create(['name' => 'Admin Pembatalan']);
        $admin->assignRole(RoleName::SuperAdmin->value);
        $service = app(RedemptionService::class);
        $redemption = $service->redeem($user, [$product->id => 2], 'redeem-cancellation-001');

        $cancelled = $service->cancel(
            $redemption,
            $admin,
            'Penukaran dibatalkan karena produk tidak lolos pemeriksaan kualitas.',
            'cancel-redemption-001',
        );

        $this->assertSame(RedemptionStatus::Cancelled, $cancelled->status);
        $this->assertSame(1000, $account->fresh()->balance);
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertDatabaseHas('point_transactions', [
            'user_id' => $user->id,
            'amount' => 400,
            'balance_before' => 600,
            'balance_after' => 1000,
            'reason' => 'Penukaran dibatalkan karena produk tidak lolos pemeriksaan kualitas.',
        ]);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'quantity' => 2,
            'stock_before' => 1,
            'stock_after' => 3,
        ]);
        $this->assertSame(1, AuditLog::query()->where('event', 'redemption.cancelled')->count());

        $same = $service->cancel(
            $cancelled,
            $admin,
            'Penukaran dibatalkan karena produk tidak lolos pemeriksaan kualitas.',
            'cancel-redemption-001',
        );

        $this->assertSame($cancelled->id, $same->id);
        $this->assertSame(2, PointTransaction::query()->count());
        $this->assertSame(2, $product->inventoryMovements()->count());
        $this->assertSame(1000, $account->fresh()->balance);
        $this->assertSame(3, $product->fresh()->stock);
    }

    /** @return array{User, PointAccount, Product} */
    private function makeFixture(int $balance, int $stock, int $price): array
    {
        $this->seed(RolePermissionSeeder::class);
        $region = Region::query()->create([
            'level' => RegionLevel::Rt,
            'code' => 'RT-MARKET',
            'name' => 'RT Marketplace',
            'slug' => 'rt-marketplace',
        ]);
        $user = User::factory()->create();
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);
        $account = PointAccount::query()->create(['user_id' => $user->id, 'balance' => $balance]);
        $category = ProductCategory::query()->create(['name' => 'Produk Test', 'slug' => 'produk-test']);
        $product = Product::query()->create([
            'product_category_id' => $category->id,
            'name' => 'Kompos Test',
            'slug' => 'kompos-test',
            'point_price' => $price,
            'stock' => $stock,
        ]);

        return [$user, $account, $product];
    }
}

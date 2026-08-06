<?php

namespace App\Services\Marketplace;

use App\Enums\InventoryMovementType;
use App\Enums\PointTransactionType;
use App\Enums\RedemptionStatus;
use App\Models\AuditLog;
use App\Models\InventoryMovement;
use App\Models\PointAccount;
use App\Models\PointTransaction;
use App\Models\Product;
use App\Models\Redemption;
use App\Models\User;
use App\Notifications\SystemNotification;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class RedeemPoints
{
    /**
     * @param  array<int, int>  $quantities  product_id => quantity
     * @param  array<string, mixed>|null  $addressSnapshot
     */
    public function handle(
        User $user,
        array $quantities,
        string $idempotencyKey,
        ?array $addressSnapshot = null,
    ): Redemption {
        Gate::forUser($user)->authorize('create', Redemption::class);
        $normalized = $this->normalizeQuantities($quantities);

        if ($idempotencyKey === '' || mb_strlen($idempotencyKey) > 100) {
            throw new DomainException('Idempotency key wajib diisi dan maksimal 100 karakter.');
        }

        return DB::transaction(function () use ($user, $normalized, $idempotencyKey, $addressSnapshot): Redemption {
            $existing = Redemption::query()
                ->where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                if ($existing->user_id !== $user->id) {
                    throw new AuthorizationException('Idempotency key dimiliki pengguna lain.');
                }

                $existingPayload = $existing->items()
                    ->pluck('quantity', 'product_id')
                    ->map(fn (mixed $quantity): int => (int) $quantity)
                    ->sortKeys()
                    ->all();

                if ($existingPayload !== $normalized) {
                    throw new DomainException('Idempotency key digunakan ulang dengan isi penukaran berbeda.');
                }

                return $existing->load(['items.product', 'pointTransaction']);
            }

            $account = PointAccount::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($account === null) {
                throw new DomainException('Akun Green Points belum tersedia.');
            }

            $products = Product::query()
                ->whereIn('id', array_keys($normalized))
                ->where('is_active', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($normalized)) {
                throw new DomainException('Satu atau lebih produk tidak tersedia.');
            }

            $totalPoints = 0;
            foreach ($normalized as $productId => $quantity) {
                $product = $products->get($productId);

                if ($product->stock < $quantity) {
                    throw new DomainException("Stok {$product->name} tidak mencukupi.");
                }

                $totalPoints += $product->point_price * $quantity;
            }

            if ($account->balance < $totalPoints) {
                throw new DomainException('Saldo Green Points tidak mencukupi.');
            }

            $redemption = Redemption::query()->create([
                'user_id' => $user->id,
                'region_id' => $user->profile?->primary_region_id,
                'number' => 'EVR-'.now()->format('Ymd').'-'.strtoupper(substr(hash('sha256', $idempotencyKey), 0, 10)),
                'total_points' => $totalPoints,
                'status' => RedemptionStatus::Pending,
                'idempotency_key' => $idempotencyKey,
                'address_snapshot' => $addressSnapshot,
            ]);

            foreach ($normalized as $productId => $quantity) {
                $product = $products->get($productId);
                $stockBefore = $product->stock;
                $stockAfter = $stockBefore - $quantity;

                $redemption->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'point_price' => $product->point_price,
                    'quantity' => $quantity,
                    'subtotal_points' => $product->point_price * $quantity,
                ]);
                $product->update(['stock' => $stockAfter]);
                InventoryMovement::query()->create([
                    'product_id' => $product->id,
                    'type' => InventoryMovementType::Redemption,
                    'quantity' => -$quantity,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'reference_type' => $redemption->getMorphClass(),
                    'reference_id' => $redemption->id,
                    'actor_id' => $user->id,
                    'reason' => 'Penukaran '.$redemption->number,
                    'occurred_at' => now(),
                ]);
            }

            $balanceBefore = $account->balance;
            $balanceAfter = $balanceBefore - $totalPoints;
            $account->update(['balance' => $balanceAfter]);
            $pointTransaction = PointTransaction::query()->create([
                'point_account_id' => $account->id,
                'user_id' => $user->id,
                'type' => PointTransactionType::Redeem,
                'amount' => -$totalPoints,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => $redemption->getMorphClass(),
                'reference_id' => $redemption->id,
                'idempotency_key' => 'redemption:'.$idempotencyKey,
                'reason' => 'Penukaran produk '.$redemption->number,
                'actor_id' => $user->id,
                'occurred_at' => now(),
            ]);
            $redemption->update(['point_transaction_id' => $pointTransaction->id]);

            AuditLog::record(
                actor: $user,
                event: 'redemption.created',
                auditable: $redemption,
                after: [
                    'status' => RedemptionStatus::Pending->value,
                    'total_points' => $totalPoints,
                    'balance_after' => $balanceAfter,
                ],
                metadata: ['product_count' => count($normalized)],
            );

            DB::afterCommit(function () use ($user, $redemption): void {
                $user->notify(new SystemNotification(
                    title: 'Penukaran Green Points dibuat',
                    message: "Penukaran {$redemption->number} menunggu diproses pengelola.",
                    href: '/marketplace/cart',
                    kind: 'redemption',
                ));
            });

            return $redemption->fresh(['items.product', 'pointTransaction']);
        }, 3);
    }

    /**
     * @param  array<int, int>  $quantities
     * @return array<int, int>
     */
    private function normalizeQuantities(array $quantities): array
    {
        if ($quantities === []) {
            throw new DomainException('Pilih minimal satu produk.');
        }

        $normalized = [];
        foreach ($quantities as $productId => $quantity) {
            if ((int) $productId <= 0 || $quantity <= 0) {
                throw new DomainException('Produk dan kuantitas penukaran tidak valid.');
            }

            $normalized[(int) $productId] = $quantity;
        }

        ksort($normalized);

        return $normalized;
    }
}

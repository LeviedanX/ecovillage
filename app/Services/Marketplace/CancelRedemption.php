<?php

namespace App\Services\Marketplace;

use App\Enums\InventoryMovementType;
use App\Enums\PointTransactionType;
use App\Enums\RedemptionStatus;
use App\Models\AuditLog;
use App\Models\InventoryMovement;
use App\Models\PointTransaction;
use App\Models\Product;
use App\Models\Redemption;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Services\PointLedgerService;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class CancelRedemption
{
    public function __construct(private PointLedgerService $ledger) {}

    public function handle(
        Redemption $redemption,
        User $actor,
        string $reason,
        string $idempotencyKey,
    ): Redemption {
        Gate::forUser($actor)->authorize('process', $redemption);
        $reason = trim($reason);
        $idempotencyKey = trim($idempotencyKey);

        if (mb_strlen($reason) < 10 || mb_strlen($reason) > 1000 || $idempotencyKey === '') {
            throw new DomainException('Alasan pembatalan dan idempotency key wajib valid.');
        }

        return DB::transaction(function () use ($redemption, $actor, $reason, $idempotencyKey): Redemption {
            $locked = Redemption::query()
                ->with(['user', 'pointTransaction', 'items'])
                ->lockForUpdate()
                ->findOrFail($redemption->id);
            $original = $locked->pointTransaction;

            if (! $original instanceof PointTransaction) {
                throw new DomainException('Transaksi debit penukaran tidak ditemukan.');
            }

            $ledgerKey = 'redemption-cancel:'.$idempotencyKey;
            if ($locked->status === RedemptionStatus::Cancelled) {
                $expectedKey = 'points-reversal:'.hash('sha256', $ledgerKey);
                $existing = PointTransaction::query()
                    ->where('idempotency_key', $expectedKey)
                    ->where('type', PointTransactionType::Reversal)
                    ->where('reference_type', $original->getMorphClass())
                    ->where('reference_id', $original->id)
                    ->first();

                if ($existing === null || $existing->reason !== $reason) {
                    throw new DomainException('Pembatalan sudah diproses dengan payload berbeda.');
                }

                return $locked;
            }

            if (! in_array($locked->status, [
                RedemptionStatus::Pending,
                RedemptionStatus::Processing,
                RedemptionStatus::Ready,
            ], true)) {
                throw new DomainException('Penukaran pada status ini tidak dapat dibatalkan.');
            }

            $this->ledger->reverse($original, $reason, $actor, $ledgerKey);

            $productIds = $locked->items->pluck('product_id')->map(fn (mixed $id): int => (int) $id)->all();
            $products = Product::query()
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($locked->items as $item) {
                $product = $products->get($item->product_id);
                if (! $product instanceof Product) {
                    throw new DomainException("Produk {$item->product_name} tidak ditemukan untuk pemulihan stok.");
                }

                $stockBefore = $product->stock;
                $stockAfter = $stockBefore + $item->quantity;
                $product->update(['stock' => $stockAfter]);
                InventoryMovement::query()->create([
                    'product_id' => $product->id,
                    'type' => InventoryMovementType::Reversal,
                    'quantity' => $item->quantity,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'reference_type' => $locked->getMorphClass(),
                    'reference_id' => $locked->id,
                    'actor_id' => $actor->id,
                    'reason' => $reason,
                    'occurred_at' => now(),
                ]);
            }

            $before = $locked->status;
            $locked->update([
                'status' => RedemptionStatus::Cancelled,
                'processed_by' => $actor->id,
                'processed_at' => now(),
                'notes' => $reason,
            ]);
            AuditLog::record(
                actor: $actor,
                event: 'redemption.cancelled',
                auditable: $locked,
                before: ['status' => $before->value],
                after: ['status' => RedemptionStatus::Cancelled->value, 'reason' => $reason],
            );

            DB::afterCommit(function () use ($locked): void {
                $locked->user->notify(new SystemNotification(
                    title: 'Penukaran dibatalkan',
                    message: "Poin dan stok untuk {$locked->number} telah dikembalikan.",
                    href: '/marketplace/cart',
                    kind: 'redemption-cancelled',
                ));
            });

            return $locked->fresh(['items', 'pointTransaction']);
        }, 3);
    }
}

<?php

namespace App\Services;

use App\Enums\PointTransactionType;
use App\Models\AuditLog;
use App\Models\PointAccount;
use App\Models\PointTransaction;
use App\Models\User;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PointLedgerService
{
    public function adjust(User $target, int $amount, string $reason, User $actor, string $idempotencyKey): PointTransaction
    {
        if ($amount === 0 || trim($reason) === '' || trim($idempotencyKey) === '') {
            throw new DomainException('Jumlah, alasan, dan idempotency key wajib valid.');
        }

        return $this->post($target, PointTransactionType::Adjustment, $amount, $reason, $actor, $idempotencyKey);
    }

    public function reverse(PointTransaction $original, string $reason, User $actor, string $idempotencyKey): PointTransaction
    {
        if (trim($reason) === '' || trim($idempotencyKey) === '') {
            throw new DomainException('Alasan reversal wajib diisi.');
        }

        $reason = trim($reason);
        $namespacedKey = 'points-reversal:'.hash('sha256', trim($idempotencyKey));

        return DB::transaction(function () use ($original, $reason, $actor, $namespacedKey): PointTransaction {
            $lockedOriginal = PointTransaction::query()->with('user')->lockForUpdate()->findOrFail($original->id);
            $existingForKey = PointTransaction::query()
                ->where('idempotency_key', $namespacedKey)
                ->lockForUpdate()
                ->first();
            if ($existingForKey !== null) {
                if ($existingForKey->type !== PointTransactionType::Reversal
                    || $existingForKey->actor_id !== $actor->id
                    || $existingForKey->user_id !== $lockedOriginal->user_id
                    || $existingForKey->amount !== -$lockedOriginal->amount
                    || $existingForKey->reference_type !== $lockedOriginal->getMorphClass()
                    || $existingForKey->reference_id !== $lockedOriginal->id
                    || $existingForKey->reason !== $reason) {
                    throw new DomainException('Idempotency key telah digunakan untuk reversal berbeda.');
                }

                return $existingForKey;
            }

            if (PointTransaction::query()
                ->where('type', PointTransactionType::Reversal)
                ->where('reference_type', $lockedOriginal->getMorphClass())
                ->where('reference_id', $lockedOriginal->id)
                ->exists()) {
                throw new DomainException('Transaksi tersebut sudah pernah dibalik.');
            }

            return $this->post(
                $lockedOriginal->user,
                PointTransactionType::Reversal,
                -$lockedOriginal->amount,
                $reason,
                $actor,
                $namespacedKey,
                $lockedOriginal,
            );
        }, 3);
    }

    private function post(
        User $target,
        PointTransactionType $type,
        int $amount,
        string $reason,
        User $actor,
        string $idempotencyKey,
        ?Model $reference = null,
    ): PointTransaction {
        return DB::transaction(function () use ($target, $type, $amount, $reason, $actor, $idempotencyKey, $reference): PointTransaction {
            $existing = PointTransaction::query()->where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
            if ($existing !== null) {
                if ($existing->actor_id !== $actor->id
                    || $existing->user_id !== $target->id
                    || $existing->type !== $type
                    || $existing->amount !== $amount
                    || $existing->reason !== trim($reason)
                    || $existing->reference_type !== $reference?->getMorphClass()
                    || $existing->reference_id !== $reference?->getKey()) {
                    throw new DomainException('Idempotency key telah digunakan untuk transaksi berbeda.');
                }

                return $existing;
            }

            $account = PointAccount::query()->firstOrCreate(['user_id' => $target->id], ['balance' => 0]);
            $account = PointAccount::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
            $before = $account->balance;
            $after = $before + $amount;
            if ($after < 0) {
                throw new DomainException('Saldo Green Points tidak boleh negatif.');
            }

            $account->update(['balance' => $after]);
            $transaction = PointTransaction::query()->create([
                'point_account_id' => $account->id,
                'user_id' => $target->id,
                'type' => $type,
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'idempotency_key' => $idempotencyKey,
                'reason' => trim($reason),
                'actor_id' => $actor->id,
                'occurred_at' => now(),
            ]);

            AuditLog::record(
                actor: $actor,
                event: 'points.'.str_replace('_', '-', $type->value),
                auditable: $transaction,
                before: ['balance' => $before],
                after: ['balance' => $after, 'amount' => $amount, 'target_user_id' => $target->id],
            );

            return $transaction;
        }, 3);
    }
}

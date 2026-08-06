<?php

namespace App\Services;

use App\Models\Redemption;
use App\Models\User;
use App\Services\Marketplace\CancelRedemption;
use App\Services\Marketplace\RedeemPoints;

class RedemptionService
{
    public function __construct(
        private RedeemPoints $action,
        private CancelRedemption $cancellation,
    ) {}

    /**
     * @param  array<int, int>  $quantities  product_id => quantity
     * @param  array<string, mixed>|null  $addressSnapshot
     */
    public function redeem(
        User $user,
        array $quantities,
        string $idempotencyKey,
        ?array $addressSnapshot = null,
    ): Redemption {
        return $this->action->handle($user, $quantities, $idempotencyKey, $addressSnapshot);
    }

    public function cancel(
        Redemption $redemption,
        User $actor,
        string $reason,
        string $idempotencyKey,
    ): Redemption {
        return $this->cancellation->handle($redemption, $actor, $reason, $idempotencyKey);
    }
}

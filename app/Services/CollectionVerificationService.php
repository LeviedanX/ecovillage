<?php

namespace App\Services;

use App\Models\CollectionRequest;
use App\Models\User;
use App\Services\Collections\VerifyCollectionRequest;

class CollectionVerificationService
{
    public function __construct(private VerifyCollectionRequest $action) {}

    /**
     * @param  array<int, int|float|string>  $verifiedWeights  collection_item_id => kilogram
     */
    public function verify(
        CollectionRequest $request,
        User $actor,
        array $verifiedWeights = [],
    ): CollectionRequest {
        return $this->action->handle($request, $actor, $verifiedWeights);
    }
}

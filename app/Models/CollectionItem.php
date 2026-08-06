<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** @property-read WasteType $wasteType */
class CollectionItem extends Model
{
    protected $fillable = [
        'collection_request_id', 'waste_type_id', 'estimated_weight', 'verified_weight',
        'verified_by', 'verified_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_weight' => 'decimal:3',
            'verified_weight' => 'decimal:3',
            'verified_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<CollectionRequest, $this> */
    public function collectionRequest(): BelongsTo
    {
        return $this->belongsTo(CollectionRequest::class);
    }

    /** @return BelongsTo<WasteType, $this> */
    public function wasteType(): BelongsTo
    {
        return $this->belongsTo(WasteType::class);
    }

    /** @return BelongsTo<User, $this> */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /** @return HasOne<ImpactCalculationItem, $this> */
    public function impactItem(): HasOne
    {
        return $this->hasOne(ImpactCalculationItem::class);
    }
}

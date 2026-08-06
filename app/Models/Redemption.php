<?php

namespace App\Models;

use App\Enums\RedemptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @property RedemptionStatus $status
 * @property-read Region|null $region
 */
class Redemption extends Model
{
    protected $fillable = [
        'user_id', 'region_id', 'number', 'total_points', 'status', 'idempotency_key',
        'address_snapshot', 'point_transaction_id', 'processed_by', 'processed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'total_points' => 'integer',
            'status' => RedemptionStatus::class,
            'address_snapshot' => 'array',
            'processed_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return HasMany<RedemptionItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(RedemptionItem::class);
    }

    /** @return BelongsTo<PointTransaction, $this> */
    public function pointTransaction(): BelongsTo
    {
        return $this->belongsTo(PointTransaction::class);
    }

    /** @return BelongsTo<User, $this> */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /** @return MorphMany<InventoryMovement, $this> */
    public function inventoryMovements(): MorphMany
    {
        return $this->morphMany(InventoryMovement::class, 'reference');
    }
}

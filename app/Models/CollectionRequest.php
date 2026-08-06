<?php

namespace App\Models;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property CollectionStatus $status
 * @property CollectionMethod $method
 * @property bool $contains_hazardous
 * @property string|null $hazardous_handling_status
 * @property array<string, mixed>|null $hazardous_partner_snapshot
 * @property Carbon|null $desired_at
 * @property Carbon|null $completed_at
 * @property-read Region $region
 * @property-read User|null $requester
 */
class CollectionRequest extends Model
{
    protected $fillable = [
        'requester_id', 'region_id', 'address_id', 'request_number', 'address_snapshot',
        'latitude', 'longitude', 'location_consent_at', 'method', 'status', 'desired_at',
        'contains_hazardous', 'hazardous_handling_status', 'hazardous_partner_snapshot',
        'notes', 'idempotency_key', 'submitted_at', 'completed_at', 'cancelled_at', 'rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'address_snapshot' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'method' => CollectionMethod::class,
            'status' => CollectionStatus::class,
            'contains_hazardous' => 'boolean',
            'hazardous_partner_snapshot' => 'array',
            'location_consent_at' => 'immutable_datetime',
            'desired_at' => 'immutable_datetime',
            'submitted_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
            'rejected_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return BelongsTo<Address, $this> */
    public function address(): BelongsTo
    {
        return $this->belongsTo(Address::class);
    }

    /** @return HasMany<CollectionItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(CollectionItem::class);
    }

    /** @return HasMany<CollectionPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(CollectionPhoto::class);
    }

    /** @return HasMany<CollectionAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(CollectionAssignment::class);
    }

    /** @return HasOne<CollectionAssignment, $this> */
    public function activeAssignment(): HasOne
    {
        return $this->hasOne(CollectionAssignment::class)->where('is_active', true)->latestOfMany();
    }

    /** @return HasMany<CollectionStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(CollectionStatusHistory::class);
    }

    /** @return HasOne<ImpactCalculation, $this> */
    public function impactCalculation(): HasOne
    {
        return $this->hasOne(ImpactCalculation::class);
    }

    /** @return MorphMany<PointTransaction, $this> */
    public function pointTransactions(): MorphMany
    {
        return $this->morphMany(PointTransaction::class, 'reference');
    }
}

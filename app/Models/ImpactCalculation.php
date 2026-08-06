<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImpactCalculation extends Model
{
    protected $fillable = [
        'collection_request_id', 'environmental_factor_set_id', 'total_verified_weight',
        'total_carbon_kg_co2e', 'total_recyclable_kg', 'total_energy_kwh',
        'methodology_snapshot', 'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'total_verified_weight' => 'decimal:3',
            'total_carbon_kg_co2e' => 'decimal:6',
            'total_recyclable_kg' => 'decimal:6',
            'total_energy_kwh' => 'decimal:6',
            'methodology_snapshot' => 'array',
            'calculated_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<CollectionRequest, $this> */
    public function collectionRequest(): BelongsTo
    {
        return $this->belongsTo(CollectionRequest::class);
    }

    /** @return BelongsTo<EnvironmentalFactorSet, $this> */
    public function factorSet(): BelongsTo
    {
        return $this->belongsTo(EnvironmentalFactorSet::class, 'environmental_factor_set_id');
    }

    /** @return HasMany<ImpactCalculationItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(ImpactCalculationItem::class);
    }
}

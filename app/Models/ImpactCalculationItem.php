<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImpactCalculationItem extends Model
{
    protected $fillable = [
        'impact_calculation_id', 'collection_item_id', 'waste_type_id', 'verified_weight',
        'carbon_kg_co2e', 'recyclable_kg', 'energy_kwh', 'factor_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'verified_weight' => 'decimal:3',
            'carbon_kg_co2e' => 'decimal:6',
            'recyclable_kg' => 'decimal:6',
            'energy_kwh' => 'decimal:6',
            'factor_snapshot' => 'array',
        ];
    }

    /** @return BelongsTo<ImpactCalculation, $this> */
    public function calculation(): BelongsTo
    {
        return $this->belongsTo(ImpactCalculation::class, 'impact_calculation_id');
    }

    /** @return BelongsTo<CollectionItem, $this> */
    public function collectionItem(): BelongsTo
    {
        return $this->belongsTo(CollectionItem::class);
    }

    /** @return BelongsTo<WasteType, $this> */
    public function wasteType(): BelongsTo
    {
        return $this->belongsTo(WasteType::class);
    }
}

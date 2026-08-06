<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentalFactor extends Model
{
    public const CARBON = 'carbon_kg_co2e';

    public const RECYCLABLE = 'recyclable_kg';

    public const ENERGY = 'energy_kwh';

    protected $fillable = [
        'environmental_factor_set_id', 'waste_type_id', 'impact_kind',
        'factor_value', 'unit', 'notes',
    ];

    protected function casts(): array
    {
        return ['factor_value' => 'decimal:8'];
    }

    /** @return BelongsTo<EnvironmentalFactorSet, $this> */
    public function factorSet(): BelongsTo
    {
        return $this->belongsTo(EnvironmentalFactorSet::class, 'environmental_factor_set_id');
    }

    /** @return BelongsTo<WasteType, $this> */
    public function wasteType(): BelongsTo
    {
        return $this->belongsTo(WasteType::class);
    }
}

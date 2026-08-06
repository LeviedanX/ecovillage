<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointRule extends Model
{
    protected $fillable = [
        'waste_type_id', 'version', 'points_per_kg', 'effective_from', 'effective_to', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'points_per_kg' => 'decimal:4',
            'effective_from' => 'immutable_datetime',
            'effective_to' => 'immutable_datetime',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<WasteType, $this> */
    public function wasteType(): BelongsTo
    {
        return $this->belongsTo(WasteType::class);
    }

    /**
     * @param  Builder<PointRule>  $query
     * @return Builder<PointRule>
     */
    public function scopeEffectiveAt(Builder $query, mixed $date): Builder
    {
        return $query->where('is_active', true)
            ->where('effective_from', '<=', $date)
            ->where(fn (Builder $builder): Builder => $builder
                ->whereNull('effective_to')
                ->orWhere('effective_to', '>=', $date));
    }
}

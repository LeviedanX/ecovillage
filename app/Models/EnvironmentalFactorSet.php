<?php

namespace App\Models;

use App\Enums\FactorSetStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int|null $region_id
 * @property string|null $scope_notes
 * @property FactorSetStatus $status
 * @property-read Region|null $region
 */
class EnvironmentalFactorSet extends Model
{
    protected $fillable = [
        'region_id', 'name', 'version', 'source_name', 'source_url', 'effective_from', 'effective_to',
        'methodology_notes', 'scope_notes', 'status', 'is_demo',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'effective_from' => 'immutable_datetime',
            'effective_to' => 'immutable_datetime',
            'status' => FactorSetStatus::class,
            'is_demo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return HasMany<EnvironmentalFactor, $this> */
    public function factors(): HasMany
    {
        return $this->hasMany(EnvironmentalFactor::class);
    }

    /** @return HasMany<ImpactCalculation, $this> */
    public function calculations(): HasMany
    {
        return $this->hasMany(ImpactCalculation::class);
    }

    /**
     * @param  Builder<EnvironmentalFactorSet>  $query
     * @return Builder<EnvironmentalFactorSet>
     */
    public function scopeActiveAt(Builder $query, mixed $date): Builder
    {
        return $query->where('status', FactorSetStatus::Active->value)
            ->where(fn (Builder $builder): Builder => $builder
                ->whereNull('effective_from')
                ->orWhere('effective_from', '<=', $date))
            ->where(fn (Builder $builder): Builder => $builder
                ->whereNull('effective_to')
                ->orWhere('effective_to', '>=', $date));
    }
}

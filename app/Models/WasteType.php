<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property-read WasteCategory $category */
class WasteType extends Model
{
    protected $fillable = [
        'waste_category_id', 'name', 'slug', 'unit', 'description',
        'handling_notes', 'image_path', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsTo<WasteCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(WasteCategory::class, 'waste_category_id');
    }

    /** @return HasMany<CollectionItem, $this> */
    public function collectionItems(): HasMany
    {
        return $this->hasMany(CollectionItem::class);
    }

    /** @return HasMany<PointRule, $this> */
    public function pointRules(): HasMany
    {
        return $this->hasMany(PointRule::class);
    }

    /** @return HasMany<EnvironmentalFactor, $this> */
    public function environmentalFactors(): HasMany
    {
        return $this->hasMany(EnvironmentalFactor::class);
    }
}

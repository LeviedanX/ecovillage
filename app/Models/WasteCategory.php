<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WasteCategory extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'is_hazardous', 'is_active', 'sort_order'];

    protected function casts(): array
    {
        return ['is_hazardous' => 'boolean', 'is_active' => 'boolean'];
    }

    /** @return HasMany<WasteType, $this> */
    public function wasteTypes(): HasMany
    {
        return $this->hasMany(WasteType::class);
    }
}

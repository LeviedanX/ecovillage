<?php

namespace App\Models;

use App\Enums\RegionLevel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection as SupportCollection;

/** @property RegionLevel $level */
class Region extends Model
{
    protected $fillable = [
        'parent_id', 'level', 'code', 'name', 'slug', 'centroid_latitude',
        'centroid_longitude', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'level' => RegionLevel::class,
            'centroid_latitude' => 'decimal:7',
            'centroid_longitude' => 'decimal:7',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Region, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Region, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'region_user_assignments')
            ->withPivot(['assignment_type', 'is_active'])
            ->withTimestamps();
    }

    /** @return HasMany<Address, $this> */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /** @return SupportCollection<int, int> */
    public function lineageIds(): SupportCollection
    {
        $ids = collect([$this->getKey()]);
        $cursor = $this;

        while ($cursor->parent_id !== null) {
            $ids->push((int) $cursor->parent_id);
            $cursor = $cursor->relationLoaded('parent')
                ? $cursor->parent
                : self::find($cursor->parent_id);

            if ($cursor === null) {
                break;
            }
        }

        return $ids;
    }
}

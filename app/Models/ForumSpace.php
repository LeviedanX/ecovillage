<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read Region|null $region
 * @property-read Program|null $program
 */
class ForumSpace extends Model
{
    protected $fillable = [
        'region_id', 'program_id', 'name', 'slug', 'description', 'visibility', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return BelongsTo<Program, $this> */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /** @return HasMany<ForumThread, $this> */
    public function threads(): HasMany
    {
        return $this->hasMany(ForumThread::class);
    }
}

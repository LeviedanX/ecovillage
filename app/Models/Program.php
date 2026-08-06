<?php

namespace App\Models;

use App\Enums\ProgramStatus;
use App\Enums\ProgramType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property ProgramType $type
 * @property ProgramStatus $status
 * @property int|null $capacity
 * @property Carbon|null $registration_starts_at
 * @property Carbon|null $registration_ends_at
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property-read Region|null $region
 */
class Program extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'region_id', 'manager_id', 'type', 'title', 'slug', 'description', 'objectives',
        'cover_disk', 'cover_path', 'location_name', 'capacity', 'registration_starts_at',
        'registration_ends_at', 'starts_at', 'ends_at', 'status', 'materials', 'outcomes',
    ];

    protected function casts(): array
    {
        return [
            'type' => ProgramType::class,
            'status' => ProgramStatus::class,
            'capacity' => 'integer',
            'registration_starts_at' => 'immutable_datetime',
            'registration_ends_at' => 'immutable_datetime',
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'materials' => 'array',
            'outcomes' => 'array',
        ];
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return BelongsTo<User, $this> */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /** @return HasMany<ProgramSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(ProgramSession::class);
    }

    /** @return HasMany<ProgramRegistration, $this> */
    public function registrations(): HasMany
    {
        return $this->hasMany(ProgramRegistration::class);
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property int $program_id */
class ProgramSession extends Model
{
    protected $fillable = [
        'program_id', 'title', 'description', 'location_name', 'starts_at', 'ends_at',
    ];

    protected function casts(): array
    {
        return ['starts_at' => 'immutable_datetime', 'ends_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<Program, $this> */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /** @return HasMany<ProgramAttendance, $this> */
    public function attendances(): HasMany
    {
        return $this->hasMany(ProgramAttendance::class);
    }
}

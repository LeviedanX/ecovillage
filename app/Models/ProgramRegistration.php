<?php

namespace App\Models;

use App\Enums\RegistrationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $program_id
 * @property RegistrationStatus $status
 * @property-read Program $program
 */
class ProgramRegistration extends Model
{
    protected $fillable = [
        'program_id', 'user_id', 'status', 'registered_at', 'cancelled_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => RegistrationStatus::class,
            'registered_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Program, $this> */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<ProgramAttendance, $this> */
    public function attendances(): HasMany
    {
        return $this->hasMany(ProgramAttendance::class);
    }
}

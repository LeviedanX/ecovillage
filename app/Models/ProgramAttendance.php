<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramAttendance extends Model
{
    protected $fillable = [
        'program_registration_id', 'program_session_id', 'recorded_by',
        'is_present', 'checked_in_at', 'notes',
    ];

    protected function casts(): array
    {
        return ['is_present' => 'boolean', 'checked_in_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<ProgramRegistration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(ProgramRegistration::class, 'program_registration_id');
    }

    /** @return BelongsTo<ProgramSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ProgramSession::class, 'program_session_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

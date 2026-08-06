<?php

namespace App\Models;

use App\Enums\ContentReportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property ContentReportStatus $status
 * @property Carbon|null $created_at
 * @property-read User|null $reporter
 * @property-read Model|null $reportable
 */
class ContentReport extends Model
{
    protected $fillable = [
        'reporter_id', 'reportable_type', 'reportable_id', 'reason', 'description',
        'status', 'reviewed_by', 'reviewed_at', 'resolution_notes',
    ];

    protected function casts(): array
    {
        return ['status' => ContentReportStatus::class, 'reviewed_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    /** @return MorphTo<Model, $this> */
    public function reportable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

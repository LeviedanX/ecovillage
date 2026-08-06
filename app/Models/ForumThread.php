<?php

namespace App\Models;

use App\Enums\ForumContentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @property ForumContentStatus $status
 * @property bool $is_locked
 */
class ForumThread extends Model
{
    protected $fillable = [
        'forum_space_id', 'user_id', 'title', 'slug', 'body', 'status',
        'is_locked', 'moderated_by', 'moderated_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ForumContentStatus::class,
            'is_locked' => 'boolean',
            'moderated_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<ForumSpace, $this> */
    public function space(): BelongsTo
    {
        return $this->belongsTo(ForumSpace::class, 'forum_space_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<ForumPost, $this> */
    public function posts(): HasMany
    {
        return $this->hasMany(ForumPost::class);
    }

    /** @return BelongsTo<User, $this> */
    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    /** @return MorphMany<ContentReport, $this> */
    public function reports(): MorphMany
    {
        return $this->morphMany(ContentReport::class, 'reportable');
    }
}

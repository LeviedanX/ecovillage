<?php

namespace App\Models;

use App\Enums\ContentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/** @property ContentStatus $status */
class EducationContent extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'education_category_id', 'author_id', 'region_id', 'title', 'slug', 'excerpt',
        'body', 'cover_disk', 'cover_path', 'external_url', 'status', 'published_at',
    ];

    protected function casts(): array
    {
        return ['status' => ContentStatus::class, 'published_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<EducationCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(EducationCategory::class, 'education_category_id');
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }
}

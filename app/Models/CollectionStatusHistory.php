<?php

namespace App\Models;

use App\Enums\CollectionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'collection_request_id', 'from_status', 'to_status', 'actor_id', 'notes', 'metadata', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'from_status' => CollectionStatus::class,
            'to_status' => CollectionStatus::class,
            'metadata' => 'array',
            'created_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<CollectionRequest, $this> */
    public function collectionRequest(): BelongsTo
    {
        return $this->belongsTo(CollectionRequest::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}

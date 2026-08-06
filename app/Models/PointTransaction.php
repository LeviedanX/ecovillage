<?php

namespace App\Models;

use App\Enums\PointTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $actor_id
 * @property PointTransactionType $type
 * @property int $amount
 * @property string|null $reason
 * @property string|null $reference_type
 * @property int|null $reference_id
 * @property string $idempotency_key
 * @property Carbon $occurred_at
 * @property Carbon|null $created_at
 * @property-read User $user
 * @property-read User|null $actor
 */
class PointTransaction extends Model
{
    protected $fillable = [
        'point_account_id', 'user_id', 'type', 'amount', 'balance_before', 'balance_after',
        'reference_type', 'reference_id', 'idempotency_key', 'reason', 'actor_id', 'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => PointTransactionType::class,
            'amount' => 'integer',
            'balance_before' => 'integer',
            'balance_after' => 'integer',
            'occurred_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<PointAccount, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(PointAccount::class, 'point_account_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @return MorphTo<Model, $this> */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}

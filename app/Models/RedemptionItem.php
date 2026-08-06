<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RedemptionItem extends Model
{
    protected $fillable = [
        'redemption_id', 'product_id', 'product_name', 'point_price', 'quantity', 'subtotal_points',
    ];

    protected function casts(): array
    {
        return [
            'point_price' => 'integer',
            'quantity' => 'integer',
            'subtotal_points' => 'integer',
        ];
    }

    /** @return BelongsTo<Redemption, $this> */
    public function redemption(): BelongsTo
    {
        return $this->belongsTo(Redemption::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

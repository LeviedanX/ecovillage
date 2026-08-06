<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property string $disk
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property int $size_bytes
 * @property string|null $alt_text
 */
class MediaAsset extends Model
{
    protected $fillable = [
        'disk', 'path', 'original_name', 'mime_type', 'size_bytes', 'alt_text', 'uploaded_by',
    ];

    public function url(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }
}

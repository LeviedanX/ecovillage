<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property string $slug
 * @property string $eyebrow
 * @property string $title
 * @property string $lead
 * @property string $icon
 * @property array<int, array<string, mixed>> $sections
 * @property string|null $hero_image_disk
 * @property string|null $hero_image_path
 * @property bool $is_active
 */
class PageContent extends Model
{
    protected $fillable = [
        'slug', 'eyebrow', 'title', 'lead', 'icon', 'sections',
        'hero_image_disk', 'hero_image_path', 'is_active', 'updated_by',
    ];

    public function heroImageUrl(): ?string
    {
        if ($this->hero_image_path === null) {
            return null;
        }

        // Aset bawaan repositori sudah berupa path absolut di document root.
        return str_starts_with($this->hero_image_path, '/')
            ? $this->hero_image_path
            : Storage::disk($this->hero_image_disk ?? 'public')->url($this->hero_image_path);
    }

    /** @return BelongsTo<User, $this> */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    protected function casts(): array
    {
        return ['sections' => 'array', 'is_active' => 'boolean'];
    }
}

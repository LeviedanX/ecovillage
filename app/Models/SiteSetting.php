<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property array<string, mixed>|string|null $value */
class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'is_public', 'updated_by'];

    /**
     * Nilai disimpan sebagai {"id": "..."} untuk menyiapkan lokalisasi.
     * Helper ini meratakannya kembali menjadi string tunggal.
     */
    public function stringValue(string $fallback = ''): string
    {
        $value = $this->value;

        if (is_array($value)) {
            return (string) ($value['id'] ?? $fallback);
        }

        return $value === null ? $fallback : (string) $value;
    }

    protected function casts(): array
    {
        return ['value' => 'array', 'is_public' => 'boolean'];
    }

    /** @return BelongsTo<User, $this> */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

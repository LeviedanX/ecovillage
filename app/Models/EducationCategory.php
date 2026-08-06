<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationCategory extends Model
{
    protected $fillable = ['name', 'slug', 'description'];

    /** @return HasMany<EducationContent, $this> */
    public function contents(): HasMany
    {
        return $this->hasMany(EducationContent::class);
    }
}

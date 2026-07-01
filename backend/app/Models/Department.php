<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = ['name', 'code', 'head_id', 'description'];

    public function head(): BelongsTo
    {
        return $this->belongsTo(User::class, 'head_id');
    }

    public function filieres(): HasMany
    {
        return $this->hasMany(Filiere::class);
    }

    public function professors(): HasMany
    {
        return $this->hasMany(Professor::class);
    }
}

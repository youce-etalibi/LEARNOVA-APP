<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Filiere extends Model
{
    protected $fillable = ['name', 'code', 'department_id', 'level', 'duration_years'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(Promotion::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }
}

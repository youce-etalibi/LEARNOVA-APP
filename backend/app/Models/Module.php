<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    protected $fillable = [
        'name', 'code', 'credits', 'hours_total', 'hours_cm',
        'hours_td', 'hours_tp', 'filiere_id', 'semester',
    ];

    public function filiere(): BelongsTo
    {
        return $this->belongsTo(Filiere::class);
    }

    public function professors(): BelongsToMany
    {
        return $this->belongsToMany(Professor::class, 'professor_module')
            ->withPivot('academic_year', 'type')
            ->withTimestamps();
    }

    public function seances(): HasMany
    {
        return $this->hasMany(Seance::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }
}

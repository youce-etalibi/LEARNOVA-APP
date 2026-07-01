<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    protected $fillable = ['name', 'filiere_id', 'academic_year', 'max_students'];

    public function filiere(): BelongsTo
    {
        return $this->belongsTo(Filiere::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function seances(): HasMany
    {
        return $this->hasMany(Seance::class);
    }

    public function plannings(): HasMany
    {
        return $this->hasMany(Planning::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Professor extends Model
{
    protected $fillable = ['user_id', 'employee_id', 'department_id', 'grade', 'speciality'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'professor_module')
            ->withPivot('academic_year', 'type')
            ->withTimestamps();
    }

    public function seances(): HasMany
    {
        return $this->hasMany(Seance::class);
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

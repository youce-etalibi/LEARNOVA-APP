<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentModuleStatus extends Model
{
    protected $fillable = [
        'student_id', 'module_id', 'academic_year', 'semester',
        'raw_average', 'ratt_average', 'final_score', 'status', 'is_locked',
    ];

    protected $casts = [
        'raw_average' => 'decimal:2',
        'ratt_average' => 'decimal:2',
        'final_score' => 'decimal:2',
        'is_locked' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}

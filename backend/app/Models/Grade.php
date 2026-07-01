<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    protected $fillable = [
        'student_id', 'module_id', 'professor_id', 'academic_year',
        'semester', 'exam_type', 'grade', 'coefficient', 'comment', 'entered_at',
    ];

    protected $casts = [
        'grade' => 'decimal:2',
        'coefficient' => 'decimal:2',
        'entered_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function professor(): BelongsTo
    {
        return $this->belongsTo(Professor::class);
    }
}

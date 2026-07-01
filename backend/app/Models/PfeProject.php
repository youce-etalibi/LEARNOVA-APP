<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PfeProject extends Model
{
    protected $fillable = [
        'student_id', 'professor_id', 'title', 'description',
        'company_name', 'supervisor_name', 'status', 'grade', 'defense_date',
    ];

    protected $casts = [
        'grade' => 'decimal:2',
        'defense_date' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function professor(): BelongsTo
    {
        return $this->belongsTo(Professor::class);
    }
}

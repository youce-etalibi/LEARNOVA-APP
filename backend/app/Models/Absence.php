<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Absence extends Model
{
    protected $fillable = [
        'student_id', 'seance_id', 'status',
        'justification', 'justified_by', 'justified_at',
    ];

    protected $casts = [
        'justified_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function seance(): BelongsTo
    {
        return $this->belongsTo(Seance::class);
    }

    public function justificationRecord(): HasOne
    {
        return $this->hasOne(Justification::class)->latestOfMany();
    }
}

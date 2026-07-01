<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionBank extends Model
{
    protected $fillable = [
        'professor_id', 'category', 'question_text', 'type', 'points', 'explanation', 'options_json',
    ];

    protected $casts = [
        'points' => 'decimal:2',
        'options_json' => 'array',
    ];

    public function professor(): BelongsTo
    {
        return $this->belongsTo(Professor::class);
    }
}

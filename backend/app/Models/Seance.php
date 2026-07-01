<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Seance extends Model
{
    protected $fillable = [
        'module_id', 'professor_id', 'promotion_id', 'room_id', 'type',
        'date', 'start_time', 'end_time', 'status', 'recurring', 'recurrence_pattern',
    ];

    protected $casts = [
        'date' => 'date',
        'recurring' => 'boolean',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function professor(): BelongsTo
    {
        return $this->belongsTo(Professor::class);
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function absences(): HasMany
    {
        return $this->hasMany(Absence::class);
    }
}

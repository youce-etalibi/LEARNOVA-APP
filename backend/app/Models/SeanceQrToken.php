<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeanceQrToken extends Model
{
    protected $fillable = [
        'seance_id', 'token', 'latitude', 'longitude', 'expires_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'expires_at' => 'datetime',
    ];

    public function seance(): BelongsTo
    {
        return $this->belongsTo(Seance::class);
    }
}

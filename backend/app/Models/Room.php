<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $fillable = ['name', 'capacity', 'type', 'building'];

    public function seances(): HasMany
    {
        return $this->hasMany(Seance::class);
    }
}

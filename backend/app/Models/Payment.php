<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $fillable = [
        'user_id', 'amount', 'currency', 'status', 'payment_method',
        'transaction_ref', 'raw_gateway_resp', 'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'raw_gateway_resp' => 'array',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function coursePurchases(): HasMany
    {
        return $this->hasMany(CoursePurchase::class);
    }

    public function invoicePayments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class);
    }
}

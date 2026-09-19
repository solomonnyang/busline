<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * PaymentModel - manages the payments table.
 */
class PaymentModel extends Model
{
    protected $table         = 'payments';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'booking_id', 'payment_reference', 'amount',
        'payment_method', 'status', 'transaction_id', 'paystack_ref', 'paid_at', 'metadata',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByReference(string $ref)
    {
        return $this->where('payment_reference', $ref)->first();
    }

    public function findByBookingId(int $bookingId)
    {
        return $this->where('booking_id', $bookingId)->orderBy('id', 'DESC')->findAll();
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * LoyaltyPointModel - manages the loyalty_points ledger.
 * Positive rows are earned points; negative rows are redemptions.
 */
class LoyaltyPointModel extends Model
{
    protected $table         = 'loyalty_points';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'customer_id', 'points', 'type', 'source', 'description',
        'reference', 'booking_id',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function balance(int $customerId): int
    {
        $row = $this->selectSum('points', 'total')
            ->where('customer_id', $customerId)
            ->get()->getRow();

        return (int) ($row->total ?? 0);
    }

    public function history(int $customerId): array
    {
        return $this->where('customer_id', $customerId)
            ->orderBy('id', 'DESC')
            ->findAll();
    }

    public function findByBooking(int $bookingId)
    {
        return $this->where('booking_id', $bookingId)->first();
    }
}

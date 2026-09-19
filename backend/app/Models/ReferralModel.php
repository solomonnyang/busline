<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * ReferralModel - manages the referrals table.
 * Tracks referral-link signups and their commission status.
 */
class ReferralModel extends Model
{
    protected $table         = 'referrals';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'referrer_customer_id', 'referred_user_id', 'referred_customer_id',
        'code', 'status', 'commission_amount', 'booking_id',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByReferredCustomer(int $customerId)
    {
        return $this->where('referred_customer_id', $customerId)->first();
    }

    public function findByReferredUser(int $userId)
    {
        return $this->where('referred_user_id', $userId)->first();
    }

    /**
     * Referrals made by a customer, with the referred user's name.
     */
    public function byReferrer(int $customerId): array
    {
        return $this->select(
            'referrals.*, users.name as referred_name, users.email as referred_email'
        )
            ->join('users', 'users.id = referrals.referred_user_id', 'left')
            ->where('referrals.referrer_customer_id', $customerId)
            ->orderBy('referrals.id', 'DESC')
            ->findAll();
    }
}

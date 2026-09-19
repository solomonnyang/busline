<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * WalletTransactionModel - manages the wallet_transactions table.
 */
class WalletTransactionModel extends Model
{
    protected $table         = 'wallet_transactions';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'wallet_id', 'type', 'amount', 'reference', 'description',
        'status', 'payment_method', 'paystack_ref', 'paid_at',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByReference(string $reference)
    {
        return $this->where('reference', $reference)->first();
    }

    public function findByWalletId(int $walletId)
    {
        return $this->where('wallet_id', $walletId)->orderBy('id', 'DESC')->findAll();
    }
}

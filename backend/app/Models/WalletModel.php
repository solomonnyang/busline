<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * WalletModel - manages the wallets table.
 */
class WalletModel extends Model
{
    protected $table         = 'wallets';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'customer_id', 'balance',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByCustomerId(int $customerId)
    {
        return $this->where('customer_id', $customerId)->first();
    }

    /**
     * Atomically add to a wallet balance.
     */
    public function credit(int $walletId, float $amount)
    {
        $this->db->table($this->table)->set('balance', 'balance + ' . (float) $amount, false)->where('id', $walletId)->update();
    }

    /**
     * Atomically subtract from a wallet balance.
     */
    public function debit(int $walletId, float $amount)
    {
        $this->db->table($this->table)->set('balance', 'balance - ' . (float) $amount, false)->where('id', $walletId)->update();
    }
}

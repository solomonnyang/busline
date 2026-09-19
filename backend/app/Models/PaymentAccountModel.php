<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * PaymentAccountModel - manages the payment_accounts table (vendor payouts).
 */
class PaymentAccountModel extends Model
{
    protected $table         = 'payment_accounts';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['vendor_id', 'bank_name', 'account_name', 'account_number', 'is_default'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByVendorId(int $vendorId)
    {
        return $this->where('vendor_id', $vendorId)->orderBy('is_default', 'DESC')->orderBy('id', 'ASC')->findAll();
    }

    /**
     * Set one account as default (clearing the others).
     */
    public function setDefault(int $vendorId, int $accountId): void
    {
        $this->where('vendor_id', $vendorId)->set(['is_default' => 0])->update();
        $this->update($accountId, ['is_default' => 1]);
    }
}

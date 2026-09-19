<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * VendorWithdrawalModel - manages the vendor_withdrawals table.
 * Vendor payout requests; an admin approves or rejects each request.
 */
class VendorWithdrawalModel extends Model
{
    protected $table         = 'vendor_withdrawals';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'vendor_id', 'amount', 'bank_name', 'account_name', 'account_number',
        'reference', 'status', 'admin_id', 'admin_note', 'processed_at',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * A vendor's withdrawals, newest first.
     */
    public function findByVendorId(int $vendorId, int $limit = 50)
    {
        return $this->where('vendor_id', $vendorId)->orderBy('id', 'DESC')->findAll($limit);
    }

    /**
     * Withdrawals with the requesting vendor's company + user info.
     */
    public function withVendor(?string $status = null, int $limit = 200)
    {
        $query = $this->select(
            'vendor_withdrawals.*, vendors.company_name, vendors.company_email,
             users.name as vendor_user_name, users.email as vendor_user_email'
        )
            ->join('vendors', 'vendors.id = vendor_withdrawals.vendor_id', 'left')
            ->join('users', 'users.id = vendors.user_id', 'left');

        if ($status) {
            $query->where('vendor_withdrawals.status', $status);
        }

        return $query->orderBy('vendor_withdrawals.id', 'DESC')->findAll($limit);
    }
}

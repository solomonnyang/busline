<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * StaffModel - manages the staff table (vendor team members).
 */
class StaffModel extends Model
{
    protected $table         = 'staff';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'user_id', 'role', 'permissions', 'is_active',
        'position', 'department', 'hire_date', 'base_salary', 'salary_frequency',
        'account_name', 'account_number', 'bank_name',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByUserId(int $userId)
    {
        return $this->where('user_id', $userId)->first();
    }

    /**
     * Staff list for a vendor with their user account info.
     */
    public function findByVendorId(int $vendorId)
    {
        $rows = $this->select(
            'staff.*, users.name, users.email, users.phone, users.avatar, users.is_active as user_active,
             users.email_verified_at'
        )
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('staff.vendor_id', $vendorId)
            ->orderBy('staff.id', 'DESC')
            ->findAll();

        foreach ($rows as &$row) {
            $row['permissions'] = json_decode($row['permissions'] ?? '[]', true);
        }
        unset($row);

        return $rows;
    }

    /**
     * Vendor a staff member belongs to (for scoping vendor_staff requests).
     */
    public function vendorIdForUser(int $userId): ?int
    {
        $row = $this->where('user_id', $userId)->first();
        return $row ? (int) $row['vendor_id'] : null;
    }

    /**
     * Active staff members with the `driver` role that are not already linked
     * to a driver record, available to be promoted to driver.
     */
    public function driverCandidates(int $vendorId)
    {
        return $this->select(
            'staff.id, staff.role, staff.is_active, users.name, users.email, users.phone, users.avatar'
        )
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('staff.vendor_id', $vendorId)
            ->where('staff.role', 'driver')
            ->where('staff.is_active', 1)
            ->where('staff.id NOT IN (SELECT driver_id_candidates.staff_id FROM drivers AS driver_id_candidates WHERE driver_id_candidates.staff_id IS NOT NULL)')
            ->orderBy('users.name', 'ASC')
            ->findAll();
    }
}

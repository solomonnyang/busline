<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * DriverModel - manages the drivers table (vendor fleet drivers).
 */
class DriverModel extends Model
{
    protected $table         = 'drivers';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'staff_id', 'name', 'phone', 'email', 'license_number',
        'license_expiry', 'avatar', 'status',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByVendorId(int $vendorId)
    {
        return $this->select('drivers.*, staff.user_id as staff_user_id, staff.role as staff_role, users.name as staff_name, users.phone as staff_phone, users.email as staff_email')
            ->join('staff', 'staff.id = drivers.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('drivers.vendor_id', $vendorId)
            ->orderBy('drivers.id', 'DESC')
            ->findAll();
    }

    /**
     * A staff member of this vendor that is not already linked to a driver
     * record is a candidate for promotion to driver.
     */
    public function findByStaffId(int $staffId): ?array
    {
        return $this->where('staff_id', $staffId)->first();
    }

    /**
     * Drivers belonging to a vendor that are active and available on the
     * given date (no overlapping trip assignment).
     */
    public function available(int $vendorId, string $date)
    {
        return $this->select('drivers.*')
            ->where('drivers.vendor_id', $vendorId)
            ->where('drivers.status', 'active')
            ->where(
                'drivers.id NOT IN (
                    SELECT td.driver_id FROM trip_drivers td
                    JOIN trips t ON t.id = td.trip_id
                    WHERE t.departure_date = ' . $this->db->escape($date) . '
                )'
            )
            ->orderBy('drivers.name', 'ASC')
            ->findAll();
    }
}

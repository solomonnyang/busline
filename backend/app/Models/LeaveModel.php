<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * LeaveModel - manages the hr_leave table (staff leave requests).
 */
class LeaveModel extends Model
{
    protected $table         = 'hr_leave';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'staff_id', 'leave_type', 'start_date', 'end_date',
        'days', 'reason', 'status', 'approved_by', 'approved_at', 'note', 'created_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * Leave records for a vendor, enriched with staff/user names.
     */
    public function findByVendorId(int $vendorId, array $filters = [])
    {
        $builder = $this->select(
            'hr_leave.*, staff.role as staff_role, users.name as staff_name, users.email as staff_email,
             approver.name as approved_by_name'
        )
            ->join('staff', 'staff.id = hr_leave.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->join('users as approver', 'approver.id = hr_leave.approved_by', 'left')
            ->where('hr_leave.vendor_id', $vendorId);

        if (! empty($filters['status'])) {
            $builder->where('hr_leave.status', $filters['status']);
        }
        if (! empty($filters['staff_id'])) {
            $builder->where('hr_leave.staff_id', (int) $filters['staff_id']);
        }
        if (! empty($filters['from'])) {
            $builder->where('hr_leave.start_date >=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $builder->where('hr_leave.start_date <=', $filters['to']);
        }

        return $builder->orderBy('hr_leave.start_date', 'DESC')->orderBy('hr_leave.id', 'DESC')->findAll();
    }

    /**
     * Count of leave requests in a given status for a vendor.
     */
    public function countByStatus(int $vendorId, string $status): int
    {
        return (int) $this->where('vendor_id', $vendorId)->where('status', $status)->countAllResults();
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * AttendanceModel - manages the hr_attendance table (daily staff attendance).
 */
class AttendanceModel extends Model
{
    protected $table         = 'hr_attendance';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'staff_id', 'date', 'check_in', 'check_out',
        'hours_worked', 'status', 'note', 'recorded_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * Attendance records for a vendor, enriched with staff/user names.
     */
    public function findByVendorId(int $vendorId, array $filters = [])
    {
        $builder = $this->select(
            'hr_attendance.*, staff.role as staff_role, users.name as staff_name, users.email as staff_email'
        )
            ->join('staff', 'staff.id = hr_attendance.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('hr_attendance.vendor_id', $vendorId);

        if (! empty($filters['date'])) {
            $builder->where('hr_attendance.date', $filters['date']);
        }
        if (! empty($filters['staff_id'])) {
            $builder->where('hr_attendance.staff_id', (int) $filters['staff_id']);
        }
        if (! empty($filters['status'])) {
            $builder->where('hr_attendance.status', $filters['status']);
        }
        if (! empty($filters['from'])) {
            $builder->where('hr_attendance.date >=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $builder->where('hr_attendance.date <=', $filters['to']);
        }

        return $builder->orderBy('hr_attendance.date', 'DESC')->orderBy('hr_attendance.staff_id', 'ASC')->findAll();
    }

    /**
     * A single attendance row for a staff member on a date, or null.
     */
    public function findForStaffDate(int $staffId, string $date)
    {
        return $this->where('staff_id', $staffId)->where('date', $date)->first();
    }

    /**
     * Present staff count for a vendor on a given date
     * (present / late / half_day all count as attended).
     */
    public function presentCountForDate(int $vendorId, string $date): int
    {
        return (int) $this->where('vendor_id', $vendorId)
            ->where('date', $date)
            ->whereIn('status', ['present', 'late', 'half_day'])
            ->countAllResults();
    }

    /**
     * Attendance rate over a date range for a vendor: attended / recorded.
     */
    public function rateForRange(int $vendorId, string $from, string $to): ?float
    {
        $rows = $this->select('status, COUNT(*) as n')
            ->where('vendor_id', $vendorId)
            ->where('date >=', $from)
            ->where('date <=', $to)
            ->groupBy('status')
            ->findAll();

        $attended = 0;
        $total    = 0;
        foreach ($rows as $row) {
            $total += (int) $row['n'];
            if (in_array($row['status'], ['present', 'late', 'half_day'], true)) {
                $attended += (int) $row['n'];
            }
        }
        return $total > 0 ? round($attended / $total * 100, 1) : null;
    }
}

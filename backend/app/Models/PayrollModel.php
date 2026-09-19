<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * PayrollModel - manages the hr_payroll table (staff pay runs).
 */
class PayrollModel extends Model
{
    protected $table         = 'hr_payroll';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'staff_id', 'run_id', 'period_start', 'period_end',
        'basic_salary', 'allowances', 'deductions', 'net_pay',
        'status', 'paid_at', 'note', 'created_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * Payroll records for a vendor, enriched with staff/user names.
     */
    public function findByVendorId(int $vendorId, array $filters = [])
    {
        $builder = $this->select(
            'hr_payroll.*, staff.role as staff_role, users.name as staff_name, users.email as staff_email'
        )
            ->join('staff', 'staff.id = hr_payroll.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('hr_payroll.vendor_id', $vendorId);

        if (! empty($filters['from'])) {
            $builder->where('hr_payroll.period_start >=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $builder->where('hr_payroll.period_start <=', $filters['to']);
        }
        if (! empty($filters['status'])) {
            $builder->where('hr_payroll.status', $filters['status']);
        }
        if (! empty($filters['staff_id'])) {
            $builder->where('hr_payroll.staff_id', (int) $filters['staff_id']);
        }

        return $builder->orderBy('hr_payroll.period_start', 'DESC')->orderBy('hr_payroll.id', 'DESC')->findAll();
    }

    /**
     * Pay lines belonging to a payroll run, enriched with staff/user names.
     */
    public function findByRunId(int $runId)
    {
        return $this->select(
            'hr_payroll.*, staff.role as staff_role, users.name as staff_name, users.email as staff_email'
        )
            ->join('staff', 'staff.id = hr_payroll.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('hr_payroll.run_id', $runId)
            ->orderBy('hr_payroll.staff_id', 'ASC')
            ->findAll();
    }

    /**
     * A staff member's own paid pay lines (their payment history), enriched
     * with the payroll-run payment reference.
     */
    public function findForStaff(int $staffId)
    {
        return $this->select(
            'hr_payroll.*, staff.role as staff_role, users.name as staff_name, users.email as staff_email,
             hr_payroll_runs.payment_ref'
        )
            ->join('staff', 'staff.id = hr_payroll.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->join('hr_payroll_runs', 'hr_payroll_runs.id = hr_payroll.run_id', 'left')
            ->where('hr_payroll.staff_id', $staffId)
            ->where('hr_payroll.status', 'paid')
            ->orderBy('hr_payroll.period_start', 'DESC')
            ->orderBy('hr_payroll.id', 'DESC')
            ->findAll();
    }

    /**
     * A single paid pay line for a staff member, enriched with the payroll-run
     * payment reference.
     */
    public function findPaidForStaff(int $payrollId, int $staffId)
    {
        return $this->select(
            'hr_payroll.*, staff.role as staff_role, users.name as staff_name, users.email as staff_email,
             hr_payroll_runs.payment_ref'
        )
            ->join('staff', 'staff.id = hr_payroll.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->join('hr_payroll_runs', 'hr_payroll_runs.id = hr_payroll.run_id', 'left')
            ->where('hr_payroll.id', $payrollId)
            ->where('hr_payroll.staff_id', $staffId)
            ->where('hr_payroll.status', 'paid')
            ->first();
    }

    /**
     * Sum of net pay for a vendor's payroll records.
     */
    public function totalNetForVendor(int $vendorId, ?string $status = null, ?string $from = null, ?string $to = null): float
    {
        $builder = $this->where('vendor_id', $vendorId);
        if ($status !== null) {
            $builder->where('status', $status);
        }
        if ($from !== null) {
            $builder->where('period_start >=', $from);
        }
        if ($to !== null) {
            $builder->where('period_start <=', $to);
        }
        return round((float) $builder->selectSum('net_pay')->get()->getRow()->net_pay ?? 0, 2);
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * PayrollRunModel - manages the hr_payroll_runs table.
 * A run groups one period's pay lines so they can be reviewed, approved,
 * and paid as a single batch.
 */
class PayrollRunModel extends Model
{
    protected $table         = 'hr_payroll_runs';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'period_start', 'period_end', 'status',
        'gross_total', 'deduction_total', 'net_total',
        'payment_ref', 'paid_at', 'created_by', 'approved_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * A vendor's payroll runs with line counts, newest period first.
     */
    public function findByVendorId(int $vendorId)
    {
        return $this->select(
            'hr_payroll_runs.*,
             COUNT(hr_payroll.id) as staff_count,
             SUM(CASE WHEN hr_payroll.status = "paid" THEN 1 ELSE 0 END) as paid_count'
        )
            ->join('hr_payroll', 'hr_payroll.run_id = hr_payroll_runs.id AND hr_payroll.deleted_at IS NULL', 'left')
            ->where('hr_payroll_runs.vendor_id', $vendorId)
            ->groupBy('hr_payroll_runs.id')
            ->orderBy('hr_payroll_runs.period_start', 'DESC')
            ->orderBy('hr_payroll_runs.id', 'DESC')
            ->findAll();
    }
}

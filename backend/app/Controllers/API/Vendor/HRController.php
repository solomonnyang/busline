<?php

namespace App\Controllers\API\Vendor;

use App\Models\AttendanceModel;
use App\Models\LeaveModel;
use App\Models\PayrollModel;
use App\Models\PayrollRunModel;
use App\Models\StaffModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * HRController
 * Full human-resources suite for vendors: staff directory overview,
 * payroll (pay runs), leave requests with approval flow, and daily
 * attendance records. All actions are vendor-scoped.
 */
class HRController extends BaseVendorController
{
    protected const LEAVE_TYPES = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other'];
    protected const ATTENDANCE_STATUSES = ['present', 'late', 'half_day', 'absent', 'leave', 'holiday'];

    protected StaffModel      $staff;
    protected PayrollModel    $payroll;
    protected PayrollRunModel $runs;
    protected LeaveModel      $leaves;
    protected AttendanceModel $attendance;

    public function __construct()
    {
        $this->staff      = model(StaffModel::class);
        $this->payroll    = model(PayrollModel::class);
        $this->runs       = model(PayrollRunModel::class);
        $this->leaves     = model(LeaveModel::class);
        $this->attendance = model(AttendanceModel::class);
    }

    /**
     * GET /api/vendor/hr/overview
     */
    public function overview(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');
        $id     = (int) $vendor['id'];

        $today  = date('Y-m-d');
        $from30 = date('Y-m-d', strtotime('-29 days'));

        $allStaff = $this->staff->findByVendorId($id);
        $active   = array_filter($allStaff, fn ($s) => (int) $s['is_active'] === 1);

        $departmentBreakdown = [];
        foreach ($active as $s) {
            $dept = ! empty($s['department']) ? $s['department'] : 'General';
            $departmentBreakdown[$dept] = ($departmentBreakdown[$dept] ?? 0) + 1;
        }
        $departmentBreakdown = array_map(
            fn ($count, $name) => ['department' => $name, 'count' => $count],
            array_values($departmentBreakdown),
            array_keys($departmentBreakdown)
        );

        // Leave approvals active today.
        $onLeaveToday = $this->leaves->where('vendor_id', $id)
            ->where('status', 'approved')
            ->where('start_date <=', $today)
            ->where('end_date >=', $today)
            ->countAllResults();

        // Payroll cost per month for the last 6 months.
        $monthlyPayroll = [];
        for ($i = 5; $i >= 0; $i--) {
            $month    = date('Y-m', strtotime("-{$i} months"));
            $monthKey = $month . '-01';
            $total    = $this->payroll->where('vendor_id', $id)
                ->where('status !=', 'cancelled')
                ->where('period_start >=', $monthKey)
                ->where('period_start <=', date('Y-m-t', strtotime($monthKey)))
                ->selectSum('net_pay')->get()->getRow()->net_pay ?? 0;
            $monthlyPayroll[] = ['month' => $month, 'total' => round((float) $total, 2)];
        }

        $monthFrom = date('Y-m-01');
        $monthTo   = date('Y-m-t');

        return api_success([
            'headcount'            => count($active),
            'total_staff'          => count($allStaff),
            'present_today'        => $this->attendance->presentCountForDate($id, $today),
            'absent_today'         => (int) $this->attendance->where('vendor_id', $id)->where('date', $today)->where('status', 'absent')->countAllResults(),
            'on_leave_today'       => (int) $onLeaveToday,
            'pending_leaves'       => $this->leaves->countByStatus($id, 'pending'),
            'attendance_rate_30d'  => $this->attendance->rateForRange($id, $from30, $today),
            'payroll_month_total'  => $this->payroll->totalNetForVendor($id, null, $monthFrom, $monthTo),
            'payroll_month_paid'   => $this->payroll->totalNetForVendor($id, 'paid', $monthFrom, $monthTo),
            'monthly_payroll'      => $monthlyPayroll,
            'department_breakdown' => $departmentBreakdown,
        ]);
    }

    /**
     * GET /api/vendor/hr/staff
     * Lightweight staff directory (for HR forms), available to anyone
     * with hr.manage rather than owner-only.
     */
    public function staffDirectory(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');

        $rows = $this->staff->findByVendorId((int) $vendor['id']);
        return api_success(array_values(array_map(fn ($s) => [
            'id'               => (int) $s['id'],
            'name'             => $s['name'],
            'email'            => $s['email'],
            'role'             => $s['role'],
            'position'         => $s['position'],
            'department'       => $s['department'],
            'base_salary'      => $s['base_salary'],
            'salary_frequency' => $s['salary_frequency'],
            'is_active'        => (int) $s['is_active'],
        ], $rows)));
    }

    /**
     * GET /api/vendor/hr/payroll?from=&to=&status=&staff_id=
     * Every active staff member appears as a payroll line (using their base
     * salary from the staff record) alongside any pay-run records.
     */
    public function payroll(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');
        $filters = array_filter([
            'from'     => $this->request->getGet('from'),
            'to'       => $this->request->getGet('to'),
            'status'   => $this->request->getGet('status'),
            'staff_id' => $this->request->getGet('staff_id'),
        ]);

        $records = $this->payroll->findByVendorId((int) $vendor['id'], $filters);
        $result  = array_map(function ($r) {
            $r['from_staff'] = false;
            return $r;
        }, $records);

        // Only overlay staff salary lines when the view is not scoped to a
        // specific pay-run status/period. status=no_record shows only them.
        $statusFilter = $filters['status'] ?? null;
        $scoped       = ! empty($filters['from']) || ! empty($filters['to'])
            || ! empty($filters['staff_id'])
            || ($statusFilter !== null && $statusFilter !== 'no_record');

        if (! $scoped) {
            $recorded = [];
            foreach ($records as $r) {
                $recorded[(int) $r['staff_id']] = true;
            }

            $members = $this->staff->findByVendorId((int) $vendor['id']);
            foreach ($members as $s) {
                if ((int) $s['is_active'] !== 1) {
                    continue;
                }
                if (isset($recorded[(int) $s['id']])) {
                    continue;
                }
                if (! empty($filters['staff_id']) && (int) $s['id'] !== (int) $filters['staff_id']) {
                    continue;
                }

                $base = (float) ($s['base_salary'] ?? 0);
                $result[] = [
                    'id'               => null,
                    'staff_id'         => (int) $s['id'],
                    'staff_name'       => $s['name'],
                    'staff_email'      => $s['email'],
                    'staff_role'       => $s['role'],
                    'period_start'     => null,
                    'period_end'       => null,
                    'basic_salary'     => $base,
                    'allowances'       => 0.0,
                    'deductions'       => 0.0,
                    'net_pay'          => $base,
                    'status'           => 'no_record',
                    'paid_at'          => null,
                    'note'             => null,
                    'salary_frequency' => $s['salary_frequency'] ?? 'monthly',
                    'from_staff'       => true,
                ];
            }
        }

        return api_success($result);
    }

    /**
     * POST /api/vendor/hr/payroll
     */
    public function createPayroll(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'staff_id'     => 'required|is_natural_no_zero',
            'run_id'       => 'permit_empty|is_natural_no_zero',
            'period_start' => 'required|valid_date',
            'period_end'   => 'required|valid_date',
            'basic_salary' => 'permit_empty|decimal|greater_than_equal_to[0]',
            'allowances'   => 'permit_empty|decimal|greater_than_equal_to[0]',
            'deductions'   => 'permit_empty|decimal|greater_than_equal_to[0]',
            'note'         => 'permit_empty|max_length[255]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $member = $this->staff->find((int) $data['staff_id']);
            if (! $member || (int) $member['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Staff member not found.', 404);
            }

            $runId = null;
            if (! empty($data['run_id'])) {
                $run = $this->runs->find((int) $data['run_id']);
                if (! $run || (int) $run['vendor_id'] !== (int) $vendor['id']) {
                    return api_error('Payroll run not found.', 404);
                }
                if ($run['status'] !== 'draft') {
                    return api_error('Only draft payroll runs accept new lines.', 409);
                }
                $runId = (int) $data['run_id'];
            }

            $basic = (float) ($data['basic_salary'] ?? 0);
            $allow = (float) ($data['allowances'] ?? 0);
            $deduc = (float) ($data['deductions'] ?? 0);

            $id = $this->payroll->insert([
                'vendor_id'     => $vendor['id'],
                'staff_id'      => (int) $data['staff_id'],
                'run_id'        => $runId,
                'period_start'  => $data['period_start'],
                'period_end'    => $data['period_end'],
                'basic_salary'  => $basic,
                'allowances'    => $allow,
                'deductions'    => $deduc,
                'net_pay'       => round($basic + $allow - $deduc, 2),
                'status'        => 'draft',
                'note'          => $data['note'] ?? null,
                'created_by'    => (int) $user['id'],
            ]);

            if ($runId !== null) {
                $this->recomputeRunTotals($runId);
            }

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.created', 'Payroll', $id, [
                'staff_id' => (int) $data['staff_id'],
                'net_pay'  => round($basic + $allow - $deduc, 2),
            ]);

            return api_success($this->payroll->find($id), 'Payroll record created.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * POST /api/vendor/hr/payroll/pay
     * Pay a staff member's salary for a calendar month.
     * Body: { staff_id, month: "YYYY-MM" }
     */
    public function paySalary(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'staff_id' => 'required|is_natural_no_zero',
            'month'    => 'required|regex_match[/^\d{4}-\d{2}$/]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $member = null;
            foreach ($this->staff->findByVendorId((int) $vendor['id']) as $s) {
                if ((int) $s['id'] === (int) $data['staff_id']) {
                    $member = $s;
                    break;
                }
            }
            if (! $member) {
                return api_error('Staff member not found.', 404);
            }

            $month = $data['month'];
            if (! strtotime($month . '-01')) {
                return api_error('Invalid month.', 422);
            }
            $periodStart = $month . '-01';
            $periodEnd   = date('Y-m-t', strtotime($periodStart));
            $monthLabel  = date('F Y', strtotime($periodStart));

            $activeRun = $this->runs->where('vendor_id', $vendor['id'])
                ->where('period_start', $periodStart)
                ->where('status !=', 'cancelled')
                ->first();
            if ($activeRun) {
                return api_error("{$monthLabel} has a payroll run — pay staff through the run.", 409);
            }

            $existing = $this->payroll->where('vendor_id', $vendor['id'])
                ->where('staff_id', (int) $data['staff_id'])
                ->where('period_start', $periodStart)
                ->where('status !=', 'cancelled')
                ->first();
            if ($existing) {
                return api_error("{$member['name']} already has a payroll record for {$monthLabel}.", 409);
            }

            $basic = (float) ($member['base_salary'] ?? 0);
            $id = $this->payroll->insert([
                'vendor_id'     => $vendor['id'],
                'staff_id'      => (int) $data['staff_id'],
                'period_start'  => $periodStart,
                'period_end'    => $periodEnd,
                'basic_salary'  => $basic,
                'allowances'    => 0,
                'deductions'    => 0,
                'net_pay'       => $basic,
                'status'        => 'paid',
                'paid_at'       => date('Y-m-d H:i:s'),
                'note'          => 'Salary for ' . $monthLabel,
                'created_by'    => (int) $user['id'],
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.paid', 'Payroll', $id, [
                'staff_id' => (int) $data['staff_id'],
                'month'    => $month,
                'net_pay'  => $basic,
            ]);

            return api_success($this->payroll->find($id), "Salary paid for {$monthLabel}.", 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/hr/payroll/(:num)
     */
    public function updatePayroll(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'period_start' => 'permit_empty|valid_date',
            'period_end'   => 'permit_empty|valid_date',
            'basic_salary' => 'permit_empty|decimal|greater_than_equal_to[0]',
            'allowances'   => 'permit_empty|decimal|greater_than_equal_to[0]',
            'deductions'   => 'permit_empty|decimal|greater_than_equal_to[0]',
            'note'         => 'permit_empty|max_length[255]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->payroll->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payroll record not found.', 404);
            }
            if ($record['status'] !== 'draft') {
                return api_error('Only draft payroll records can be edited.', 409);
            }
            if (! empty($record['run_id'])) {
                $run = $this->runs->find((int) $record['run_id']);
                if ($run && in_array($run['status'], ['approved', 'paid'], true)) {
                    return api_error('This payroll run has been approved and can no longer be edited.', 409);
                }
            }

            $payload = [];
            foreach (['period_start', 'period_end', 'note'] as $field) {
                if (array_key_exists($field, $data)) {
                    $payload[$field] = $data[$field];
                }
            }
            $basic = isset($data['basic_salary']) ? (float) $data['basic_salary'] : (float) $record['basic_salary'];
            $allow = isset($data['allowances']) ? (float) $data['allowances'] : (float) $record['allowances'];
            $deduc = isset($data['deductions']) ? (float) $data['deductions'] : (float) $record['deductions'];
            $payload['basic_salary'] = $basic;
            $payload['allowances']   = $allow;
            $payload['deductions']   = $deduc;
            $payload['net_pay']      = round($basic + $allow - $deduc, 2);

            $this->payroll->update($id, $payload);

            if (! empty($record['run_id'])) {
                $this->recomputeRunTotals((int) $record['run_id']);
            }

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.updated', 'Payroll', $id, [
                'net_pay' => $payload['net_pay'],
            ]);

            return api_success($this->payroll->find($id), 'Payroll record updated.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * POST /api/vendor/hr/payroll/(:num)/mark-paid
     */
    public function markPaid(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->payroll->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payroll record not found.', 404);
            }
            if ($record['status'] !== 'draft') {
                return api_error('Only draft payroll records can be marked as paid.', 409);
            }
            if (! empty($record['run_id'])) {
                return api_error('This line belongs to a payroll run — pay the run instead.', 409);
            }

            $this->payroll->update($id, ['status' => 'paid', 'paid_at' => date('Y-m-d H:i:s')]);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.paid', 'Payroll', $id, [
                'net_pay' => (float) $record['net_pay'],
            ]);

            return api_success($this->payroll->find($id), 'Payroll marked as paid.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/hr/payroll/(:num)
     */
    public function deletePayroll(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->payroll->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payroll record not found.', 404);
            }
            if (! empty($record['run_id'])) {
                $run = $this->runs->find((int) $record['run_id']);
                if ($run && in_array($run['status'], ['approved', 'paid'], true)) {
                    return api_error('This payroll run has been approved and can no longer be deleted.', 409);
                }
            }

            $this->payroll->delete($id);

            if (! empty($record['run_id'])) {
                $this->recomputeRunTotals((int) $record['run_id']);
            }
            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.deleted', 'Payroll', $id);

            return api_success(null, 'Payroll record deleted.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * GET /api/vendor/hr/payroll/runs
     * List a vendor's payroll runs with per-run line counts.
     */
    public function payrollRuns(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');

        $result = array_map(function ($r) {
            $r['staff_count']    = (int) $r['staff_count'];
            $r['paid_count']     = (int) $r['paid_count'];
            $r['period_label']   = date('F Y', strtotime($r['period_start']));
            $r['gross_total']    = round((float) $r['gross_total'], 2);
            $r['deduction_total'] = round((float) $r['deduction_total'], 2);
            $r['net_total']      = round((float) $r['net_total'], 2);
            return $r;
        }, $this->runs->findByVendorId((int) $vendor['id']));

        return api_success($result);
    }

    /**
     * GET /api/vendor/hr/payroll/runs/(:num)
     */
    public function payrollRun(int $id): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');

        $run = $this->runs->find($id);
        if (! $run || (int) $run['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Payroll run not found.', 404);
        }

        $run['period_label']    = date('F Y', strtotime($run['period_start']));
        $run['gross_total']     = round((float) $run['gross_total'], 2);
        $run['deduction_total'] = round((float) $run['deduction_total'], 2);
        $run['net_total']       = round((float) $run['net_total'], 2);

        return api_success([
            'run'   => $run,
            'lines' => $this->payroll->findByRunId((int) $id),
        ]);
    }

    /**
     * POST /api/vendor/hr/payroll/runs/generate
     * Create a payroll run for a month and snapshot every active staff member
     * that does not already have a pay line for the period.
     * Body: { month: "YYYY-MM" }
     */
    public function generatePayrollRun(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'month' => 'required|regex_match[/^\d{4}-\d{2}$/]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $month = $data['month'];
            if (! strtotime($month . '-01')) {
                return api_error('Invalid month.', 422);
            }
            $periodStart = $month . '-01';
            $periodEnd   = date('Y-m-t', strtotime($periodStart));
            $monthLabel  = date('F Y', strtotime($periodStart));

            $existing = $this->runs->where('vendor_id', $vendor['id'])
                ->where('period_start', $periodStart)
                ->where('status !=', 'cancelled')
                ->first();
            if ($existing) {
                return api_error("A payroll run for {$monthLabel} already exists.", 409);
            }

            $recorded = [];
            foreach ($this->payroll->where('vendor_id', $vendor['id'])
                ->where('period_start', $periodStart)
                ->where('status !=', 'cancelled')
                ->findAll() as $r) {
                $recorded[(int) $r['staff_id']] = true;
            }

            $runId = $this->runs->insert([
                'vendor_id'       => $vendor['id'],
                'period_start'    => $periodStart,
                'period_end'      => $periodEnd,
                'status'          => 'draft',
                'gross_total'     => 0,
                'deduction_total' => 0,
                'net_total'       => 0,
                'created_by'      => (int) $user['id'],
            ]);

            $gross = 0.0;
            $deduc = 0.0;
            $net   = 0.0;
            foreach ($this->staff->findByVendorId((int) $vendor['id']) as $s) {
                if ((int) $s['is_active'] !== 1) {
                    continue;
                }
                if (isset($recorded[(int) $s['id']])) {
                    continue;
                }
                $basic = (float) ($s['base_salary'] ?? 0);
                $this->payroll->insert([
                    'vendor_id'     => $vendor['id'],
                    'staff_id'      => (int) $s['id'],
                    'run_id'        => $runId,
                    'period_start'  => $periodStart,
                    'period_end'    => $periodEnd,
                    'basic_salary'  => $basic,
                    'allowances'    => 0,
                    'deductions'    => 0,
                    'net_pay'       => $basic,
                    'status'        => 'draft',
                    'note'          => 'Salary for ' . $monthLabel,
                    'created_by'    => (int) $user['id'],
                ]);
                $gross += $basic;
                $net   += $basic;
            }

            $this->runs->update($runId, [
                'gross_total'     => round($gross, 2),
                'deduction_total' => round($deduc, 2),
                'net_total'       => round($net, 2),
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.run_generated', 'PayrollRun', $runId, [
                'period_start' => $periodStart,
                'net_total'    => round($net, 2),
            ]);

            return api_success([
                'run'   => $this->runs->find($runId),
                'lines' => $this->payroll->findByRunId((int) $runId),
            ], "Payroll run generated for {$monthLabel}.", 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * POST /api/vendor/hr/payroll/runs/(:num)/approve
     */
    public function approvePayrollRun(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $run = $this->runs->find($id);
            if (! $run || (int) $run['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payroll run not found.', 404);
            }
            if ($run['status'] !== 'draft') {
                return api_error('Only draft payroll runs can be approved.', 409);
            }

            $this->runs->update($id, ['status' => 'approved', 'approved_by' => (int) $user['id']]);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.run_approved', 'PayrollRun', $id, [
                'period_start' => $run['period_start'],
            ]);

            return api_success($this->runs->find($id), 'Payroll run approved.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * POST /api/vendor/hr/payroll/runs/(:num)/pay
     * Mark an approved run as paid (bulk). Optional body: { payment_ref }.
     */
    public function payPayrollRun(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $run = $this->runs->find($id);
            if (! $run || (int) $run['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payroll run not found.', 404);
            }
            if ($run['status'] !== 'approved') {
                return api_error('Only approved payroll runs can be paid.', 409);
            }

            $body       = $this->request->getJSON(true) ?? [];
            $paymentRef = trim((string) ($body['payment_ref'] ?? ''));
            if ($paymentRef === '') {
                $paymentRef = 'RUN-' . strtoupper(bin2hex(random_bytes(4)));
            }

            $now = date('Y-m-d H:i:s');
            $this->runs->update($id, [
                'status'      => 'paid',
                'payment_ref' => $paymentRef,
                'paid_at'     => $now,
            ]);
            $this->payroll->builder()
                ->where('run_id', $id)
                ->where('status !=', 'cancelled')
                ->set(['status' => 'paid', 'paid_at' => $now])
                ->update();

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.run_paid', 'PayrollRun', $id, [
                'period_start' => $run['period_start'],
                'payment_ref'  => $paymentRef,
                'net_total'    => (float) $run['net_total'],
            ]);

            return api_success($this->runs->find($id), 'Payroll run marked as paid.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * POST /api/vendor/hr/payroll/runs/(:num)/cancel
     */
    public function cancelPayrollRun(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $run = $this->runs->find($id);
            if (! $run || (int) $run['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payroll run not found.', 404);
            }
            if (! in_array($run['status'], ['draft', 'approved'], true)) {
                return api_error('A paid payroll run cannot be cancelled.', 409);
            }

            $this->runs->update($id, ['status' => 'cancelled']);
            $this->payroll->builder()
                ->where('run_id', $id)
                ->where('status !=', 'paid')
                ->set(['status' => 'cancelled'])
                ->update();

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.payroll.run_cancelled', 'PayrollRun', $id, [
                'period_start' => $run['period_start'],
            ]);

            return api_success($this->runs->find($id), 'Payroll run cancelled.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * Recompute and store a run's totals from its non-cancelled pay lines.
     */
    protected function recomputeRunTotals(int $runId): void
    {
        $lines = $this->payroll->where('run_id', $runId)
            ->where('status !=', 'cancelled')
            ->findAll();

        $gross = 0.0;
        $deduc = 0.0;
        $net   = 0.0;
        foreach ($lines as $line) {
            $gross += (float) $line['basic_salary'] + (float) $line['allowances'];
            $deduc += (float) $line['deductions'];
            $net   += (float) $line['net_pay'];
        }

        $this->runs->update($runId, [
            'gross_total'     => round($gross, 2),
            'deduction_total' => round($deduc, 2),
            'net_total'       => round($net, 2),
        ]);
    }

    /**
     * GET /api/vendor/hr/leaves?status=&staff_id=
     */
    public function leaves(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');
        $filters = array_filter([
            'status'   => $this->request->getGet('status'),
            'staff_id' => $this->request->getGet('staff_id'),
            'from'     => $this->request->getGet('from'),
            'to'       => $this->request->getGet('to'),
        ]);

        return api_success($this->leaves->findByVendorId((int) $vendor['id'], $filters));
    }

    /**
     * POST /api/vendor/hr/leaves
     */
    public function createLeave(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'staff_id'   => 'required|is_natural_no_zero',
            'leave_type' => 'required|in_list[' . implode(',', self::LEAVE_TYPES) . ']',
            'start_date' => 'required|valid_date',
            'end_date'   => 'required|valid_date',
            'reason'     => 'permit_empty|max_length[500]',
            'note'       => 'permit_empty|max_length[255]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $member = $this->staff->find((int) $data['staff_id']);
            if (! $member || (int) $member['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Staff member not found.', 404);
            }

            $start = strtotime($data['start_date']);
            $end   = strtotime($data['end_date']);
            if (! $start || ! $end || $end < $start) {
                return api_error('Leave end date must be on or after the start date.', 422);
            }
            $days = (int) round(($end - $start) / 86400) + 1;

            $id = $this->leaves->insert([
                'vendor_id'   => $vendor['id'],
                'staff_id'    => (int) $data['staff_id'],
                'leave_type'  => $data['leave_type'],
                'start_date'  => $data['start_date'],
                'end_date'    => $data['end_date'],
                'days'        => $days,
                'reason'      => $data['reason'] ?? null,
                'status'      => 'pending',
                'note'        => $data['note'] ?? null,
                'created_by'  => (int) $user['id'],
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.leave.created', 'Leave', $id, [
                'staff_id' => (int) $data['staff_id'],
                'days'     => $days,
            ]);

            return api_success($this->leaves->find($id), 'Leave request created.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/hr/leaves/(:num)
     */
    public function updateLeave(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'leave_type' => 'permit_empty|in_list[' . implode(',', self::LEAVE_TYPES) . ']',
            'start_date' => 'permit_empty|valid_date',
            'end_date'   => 'permit_empty|valid_date',
            'reason'     => 'permit_empty|max_length[500]',
            'note'       => 'permit_empty|max_length[255]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->leaves->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Leave request not found.', 404);
            }
            if ($record['status'] !== 'pending') {
                return api_error('Only pending leave requests can be edited.', 409);
            }

            $payload = [];
            foreach (['leave_type', 'reason', 'note'] as $field) {
                if (array_key_exists($field, $data)) {
                    $payload[$field] = $data[$field];
                }
            }

            $start = $data['start_date'] ?? $record['start_date'];
            $end   = $data['end_date'] ?? $record['end_date'];
            $startT = strtotime($start);
            $endT   = strtotime($end);
            if ($endT < $startT) {
                return api_error('Leave end date must be on or after the start date.', 422);
            }
            $payload['start_date'] = $start;
            $payload['end_date']   = $end;
            $payload['days']       = (int) round(($endT - $startT) / 86400) + 1;

            $this->leaves->update($id, $payload);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.leave.updated', 'Leave', $id);

            return api_success($this->leaves->find($id), 'Leave request updated.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/hr/leaves/(:num)/status
     */
    public function leaveStatus(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'status' => 'required|in_list[approved,rejected,cancelled]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $record = $this->leaves->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Leave request not found.', 404);
            }

            $payload = ['status' => $data['status']];
            if (in_array($data['status'], ['approved', 'rejected'], true)) {
                $payload['approved_by'] = (int) $user['id'];
                $payload['approved_at'] = date('Y-m-d H:i:s');
            }

            $this->leaves->update($id, $payload);

            $this->audit()->vendorAction((int) $vendor['id'], 'hr.leave.' . $data['status'], 'Leave', $id);

            return api_success($this->leaves->find($id), 'Leave request ' . $data['status'] . '.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/hr/leaves/(:num)
     */
    public function deleteLeave(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->leaves->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Leave request not found.', 404);
            }

            $this->leaves->delete($id);
            $this->audit()->vendorAction((int) $vendor['id'], 'hr.leave.deleted', 'Leave', $id);

            return api_success(null, 'Leave request deleted.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * GET /api/vendor/hr/attendance?date=&staff_id=&status=&from=&to=
     */
    public function attendance(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('hr.manage');
        $filters = array_filter([
            'date'     => $this->request->getGet('date'),
            'staff_id' => $this->request->getGet('staff_id'),
            'status'   => $this->request->getGet('status'),
            'from'     => $this->request->getGet('from'),
            'to'       => $this->request->getGet('to'),
        ]);

        return api_success($this->attendance->findByVendorId((int) $vendor['id'], $filters));
    }

    /**
     * POST /api/vendor/hr/attendance
     * Upserts attendance for a date. Accepts a single record or a bulk
     * `records` array [{staff_id, check_in, check_out, hours_worked, status, note}].
     */
    public function saveAttendance(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'date'    => 'required|valid_date',
            'records' => 'permit_empty',
            'staff_id' => 'permit_empty|is_natural_no_zero',
            'check_in' => 'permit_empty',
            'check_out' => 'permit_empty',
            'hours_worked' => 'permit_empty|decimal|greater_than_equal_to[0]',
            'status'  => 'permit_empty|in_list[' . implode(',', self::ATTENDANCE_STATUSES) . ']',
            'note'    => 'permit_empty|max_length[255]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');
            $user = $this->currentUser();

            $records = $data['records'] ?? null;
            if ($records !== null) {
                if (! is_array($records) || $records === []) {
                    return api_error('Provide at least one attendance record.', 422);
                }
                $results = [];
                foreach ($records as $row) {
                    if (empty($row['staff_id'])) {
                        continue;
                    }
                    $results[] = $this->upsertAttendance($vendor['id'], $user['id'], $data['date'], $row);
                }
                return api_success(['count' => count($results), 'records' => $results], 'Attendance saved.');
            }

            if (empty($data['staff_id'])) {
                return api_error('Provide a staff_id or a records array.', 422);
            }

            $row = $this->upsertAttendance($vendor['id'], $user['id'], $data['date'], $data);
            return api_success($row, 'Attendance saved.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/hr/attendance/(:num)
     */
    public function updateAttendance(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'check_in'     => 'permit_empty',
            'check_out'    => 'permit_empty',
            'hours_worked' => 'permit_empty|decimal|greater_than_equal_to[0]',
            'status'       => 'permit_empty|in_list[' . implode(',', self::ATTENDANCE_STATUSES) . ']',
            'note'         => 'permit_empty|max_length[255]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->attendance->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Attendance record not found.', 404);
            }

            $payload = [];
            foreach (['check_in', 'check_out', 'status', 'note'] as $field) {
                if (array_key_exists($field, $data)) {
                    $payload[$field] = $data[$field] ?: null;
                }
            }
            if (isset($data['hours_worked'])) {
                $payload['hours_worked'] = (float) $data['hours_worked'];
            } elseif (isset($payload['check_in'], $payload['check_out'])) {
                $payload['hours_worked'] = $this->hoursBetween($payload['check_in'], $payload['check_out']);
            }

            $this->attendance->update($id, $payload);
            $this->audit()->vendorAction((int) $vendor['id'], 'hr.attendance.updated', 'Attendance', $id);

            return api_success($this->attendance->find($id), 'Attendance updated.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/hr/attendance/(:num)
     */
    public function deleteAttendance(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('hr.manage');

            $record = $this->attendance->find($id);
            if (! $record || (int) $record['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Attendance record not found.', 404);
            }

            $this->attendance->delete($id);
            $this->audit()->vendorAction((int) $vendor['id'], 'hr.attendance.deleted', 'Attendance', $id);

            return api_success(null, 'Attendance record deleted.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * Insert or update a single attendance row for (staff, date).
     */
    protected function upsertAttendance(int $vendorId, int $actorId, string $date, array $row): array
    {
        $member = $this->staff->find((int) $row['staff_id']);
        if (! $member || (int) $member['vendor_id'] !== $vendorId) {
            throw new \RuntimeException('Staff member not found.');
        }

        $existing = $this->attendance->findForStaffDate((int) $row['staff_id'], $date);
        $payload  = [
            'vendor_id'     => $vendorId,
            'staff_id'      => (int) $row['staff_id'],
            'date'          => $date,
            'check_in'      => $row['check_in'] ?? null,
            'check_out'     => $row['check_out'] ?? null,
            'hours_worked'  => isset($row['hours_worked']) ? (float) $row['hours_worked'] : 0,
            'status'        => $row['status'] ?? 'present',
            'note'          => $row['note'] ?? null,
        ];

        if (! empty($payload['check_in']) && ! empty($payload['check_out']) && empty($row['hours_worked'])) {
            $payload['hours_worked'] = $this->hoursBetween($payload['check_in'], $payload['check_out']);
        }

        if ($existing) {
            $payload['recorded_by'] = $existing['recorded_by'] ?? $actorId;
            $this->attendance->update($existing['id'], $payload);
            $this->audit()->vendorAction($vendorId, 'hr.attendance.updated', 'Attendance', (int) $existing['id']);
            return $this->attendance->find($existing['id']);
        }

        $payload['recorded_by'] = $actorId;
        $id = $this->attendance->insert($payload);
        $this->audit()->vendorAction($vendorId, 'hr.attendance.created', 'Attendance', $id);
        return $this->attendance->find($id);
    }

    /**
     * Decimal hours between two "H:i" (or H:i:s) times.
     */
    protected function hoursBetween(string $start, string $end): float
    {
        $s = strtotime(date('Y-m-d') . ' ' . $start);
        $e = strtotime(date('Y-m-d') . ' ' . $end);
        if (! $s || ! $e) {
            return 0;
        }
        if ($e < $s) {
            $e += 86400; // crossing midnight
        }
        return round(($e - $s) / 3600, 2);
    }
}

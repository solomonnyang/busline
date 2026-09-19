<?php

namespace App\Controllers\API\Vendor;

use App\Models\PayrollModel;
use App\Models\StaffModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * StaffPaymentsController
 * Staff self-service: a staff member may view their own payment history and
 * pull a receipt for any paid pay line. No `hr.manage` permission is required
 * — access is scoped to the authenticated staff member's own records.
 */
class StaffPaymentsController extends BaseVendorController
{
    protected StaffModel   $staff;
    protected PayrollModel $payroll;
    protected UserModel    $users;

    public function __construct()
    {
        $this->staff   = model(StaffModel::class);
        $this->payroll = model(PayrollModel::class);
        $this->users   = model(UserModel::class);
    }

    /**
     * GET /api/vendor/my/payments
     * The caller's own paid payroll history plus a small salary summary.
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $member = $this->staff();
        if (! $member) {
            return api_success([
                'summary'  => null,
                'payments' => [],
            ]);
        }

        $user     = $this->users->find((int) $member['user_id']);
        $payments = $this->payroll->findForStaff((int) $member['id']);

        $totalPaid  = 0.0;
        $lastPaidAt = null;
        foreach ($payments as $p) {
            $totalPaid += (float) ($p['net_pay'] ?? 0);
            if ($lastPaidAt === null || ($p['paid_at'] ?? '') > $lastPaidAt) {
                $lastPaidAt = $p['paid_at'] ?? null;
            }
        }

        return api_success([
            'summary' => [
                'staff_id'         => (int) $member['id'],
                'name'             => $user['name'] ?? null,
                'email'            => $user['email'] ?? null,
                'role'             => $member['role'],
                'position'         => $member['position'] ?? null,
                'department'       => $member['department'] ?? null,
                'base_salary'      => isset($member['base_salary']) ? (float) $member['base_salary'] : null,
                'salary_frequency' => $member['salary_frequency'] ?? 'monthly',
                'bank_name'        => $member['bank_name'] ?? null,
                'account_number'   => $member['account_number'] ?? null,
                'account_name'     => $member['account_name'] ?? null,
                'total_paid'       => round($totalPaid, 2),
                'payments_count'   => count($payments),
                'last_paid_at'     => $lastPaidAt,
            ],
            'payments' => $payments,
        ]);
    }

    /**
     * GET /api/vendor/my/payments/(:num)
     * A single paid pay line with the staff + company info needed for a receipt.
     */
    public function show(int $id): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $member = $this->staff();
        if (! $member) {
            return api_error('Only staff members have payment records.', 403);
        }

        $payment = $this->payroll->findPaidForStaff($id, (int) $member['id']);
        if (! $payment) {
            return api_error('Payment record not found.', 404);
        }

        $user = $this->users->find((int) $member['user_id']);

        return api_success([
            'payment' => $payment,
            'staff'   => [
                'staff_id'       => (int) $member['id'],
                'name'           => $payment['staff_name'] ?? ($user['name'] ?? null),
                'email'          => $payment['staff_email'] ?? ($user['email'] ?? null),
                'role'           => $member['role'],
                'position'       => $member['position'] ?? null,
                'department'     => $member['department'] ?? null,
                'bank_name'      => $member['bank_name'] ?? null,
                'account_number' => $member['account_number'] ?? null,
                'account_name'   => $member['account_name'] ?? null,
            ],
            'company' => $this->company($vendor),
        ]);
    }

    /**
     * The vendor's company identity for the receipt letterhead.
     */
    protected function company(array $vendor): array
    {
        return [
            'name'    => $vendor['company_name'] ?? null,
            'email'   => $vendor['company_email'] ?? null,
            'phone'   => $vendor['company_phone'] ?? null,
            'address' => $vendor['address'] ?? null,
            'city'    => $vendor['city'] ?? null,
            'country' => $vendor['country'] ?? null,
        ];
    }
}

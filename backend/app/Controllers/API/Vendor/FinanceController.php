<?php

namespace App\Controllers\API\Vendor;

use App\Models\PaymentAccountModel;
use App\Models\VendorWithdrawalModel;
use App\Models\WalletTransactionModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * FinanceController
 * Vendor payout accounts and financial transactions.
 */
class FinanceController extends BaseVendorController
{
    protected PaymentAccountModel $accounts;
    protected VendorWithdrawalModel $withdrawals;
    protected WalletTransactionModel $walletTx;

    public function __construct()
    {
        $this->accounts   = model(PaymentAccountModel::class);
        $this->withdrawals = model(VendorWithdrawalModel::class);
        $this->walletTx   = model(WalletTransactionModel::class);
    }

    // ------------------------------------------------------------------
    // Payment accounts
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/payment-accounts
     */
    public function accounts(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        return api_success($this->accounts->findByVendorId((int) $vendor['id']));
    }

    /**
     * POST /api/vendor/payment-accounts
     */
    public function createAccount(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'bank_name'      => 'required|max_length[100]',
            'account_name'   => 'required|max_length[150]',
            'account_number' => 'required|max_length[30]',
            'is_default'     => 'permit_empty|in_list[0,1]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('finance.manage');

            $accountId = $this->accounts->insert([
                'vendor_id'      => $vendor['id'],
                'bank_name'      => $data['bank_name'],
                'account_name'   => $data['account_name'],
                'account_number' => $data['account_number'],
                'is_default'     => (int) ($data['is_default'] ?? 0),
            ]);

            if ((int) ($data['is_default'] ?? 0) === 1) {
                $this->accounts->setDefault((int) $vendor['id'], $accountId);
            }

            return api_success($this->accounts->find($accountId), 'Payment account added successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/payment-accounts/(:num)
     */
    public function updateAccount(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'bank_name'      => 'permit_empty|max_length[100]',
            'account_name'   => 'permit_empty|max_length[150]',
            'account_number' => 'permit_empty|max_length[30]',
            'is_default'     => 'permit_empty|in_list[0,1]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $account = $this->accounts->find($id);
            if (! $account || (int) $account['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payment account not found.', 404);
            }

            $this->requirePermission('finance.manage');

            $payload = array_filter([
                'bank_name'      => $data['bank_name'] ?? null,
                'account_name'   => $data['account_name'] ?? null,
                'account_number' => $data['account_number'] ?? null,
            ], fn ($v) => $v !== null && $v !== '');

            if ($payload) {
                $this->accounts->update($id, $payload);
            }
            if (isset($data['is_default']) && (int) $data['is_default'] === 1) {
                $this->accounts->setDefault((int) $vendor['id'], $id);
            }

            return api_success($this->accounts->find($id), 'Payment account updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/payment-accounts/(:num)
     */
    public function deleteAccount(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $account = $this->accounts->find($id);
            if (! $account || (int) $account['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Payment account not found.', 404);
            }

            $this->requirePermission('finance.manage');
            $this->accounts->delete($id);

            return api_success(null, 'Payment account removed successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    // ------------------------------------------------------------------
    // Withdrawals
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/withdrawals
     */
    public function withdrawals(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $rows = $this->withdrawals->where('vendor_id', (int) $vendor['id'])
            ->orderBy('id', 'DESC')
            ->findAll(100);
        return api_success($rows);
    }

    // ------------------------------------------------------------------
    // Transactions
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/finance/transactions
     * Consolidated recent activity: wallet top-ups (via customers' wallets is
     * out of scope) — here we surface the vendor's bookings, payouts and any
     * wallet adjustments. For now: booking payments + withdrawals.
     */
    public function transactions(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $id     = (int) $vendor['id'];
        $db     = \Config\Database::connect();

        $payments = $db->table('payments')
            ->select(
                'payments.id, payments.payment_reference as reference, payments.amount,
                 payments.payment_method, payments.status, payments.paid_at as created_at,
                 bookings.booking_number as label, "booking" as kind'
            )
            ->join('bookings', 'bookings.id = payments.booking_id', 'left')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->where('trips.vendor_id', $id)
            ->orderBy('payments.id', 'DESC')
            ->limit(200)
            ->get()->getResultArray();

        $payouts = $db->table('vendor_withdrawals')
            ->select(
                'vendor_withdrawals.id, vendor_withdrawals.reference, vendor_withdrawals.amount,
                 "bank" as payment_method, vendor_withdrawals.status, vendor_withdrawals.created_at,
                 CONCAT("Withdrawal to ", vendor_withdrawals.bank_name) as label, "withdrawal" as kind'
            )
            ->where('vendor_withdrawals.vendor_id', $id)
            ->orderBy('vendor_withdrawals.id', 'DESC')
            ->limit(200)
            ->get()->getResultArray();

        $merged = array_merge($payments, $payouts);
        usort($merged, fn ($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        return api_success(array_slice($merged, 0, 200));
    }
}

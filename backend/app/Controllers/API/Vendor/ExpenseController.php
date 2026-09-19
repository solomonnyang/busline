<?php

namespace App\Controllers\API\Vendor;

use App\Models\ExpenseModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * ExpenseController
 * Vendor-scoped operating expenses with a profit summary
 * (revenue minus expenses for a period).
 */
class ExpenseController extends BaseVendorController
{
    protected ExpenseModel $expenses;

    public function __construct()
    {
        $this->expenses = model(ExpenseModel::class);
    }

    /**
     * GET /api/vendor/expenses?from=&to=&category=
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $filters = array_filter([
            'from'     => $this->request->getGet('from'),
            'to'       => $this->request->getGet('to'),
            'category' => $this->request->getGet('category'),
        ]);

        return api_success($this->expenses->findByVendorId((int) $vendor['id'], $filters));
    }

    /**
     * GET /api/vendor/expenses/summary?from=&to=
     * Profit = confirmed & paid booking revenue minus expenses in the period.
     */
    public function summary(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $id     = (int) $vendor['id'];

        $from = $this->request->getGet('from') ?: date('Y-m-d', strtotime('-30 days'));
        $to   = $this->request->getGet('to') ?: date('Y-m-d');

        $db = \Config\Database::connect();

        // Revenue: confirmed + paid bookings in the period (matches /vendor/revenue).
        $revenueRows = $db->table('bookings')
            ->select('DATE(bookings.booking_date) as day, COALESCE(SUM(bookings.total_amount),0) as revenue')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('bookings.status', 'confirmed')
            ->where('bookings.payment_status', 'paid')
            ->where('bookings.booking_date >=', $from . ' 00:00:00')
            ->where('bookings.booking_date <=', $to . ' 23:59:59')
            ->groupBy('DAY(bookings.booking_date)')
            ->get()->getResultArray();

        $revenueByDay = [];
        foreach ($revenueRows as $r) {
            $revenueByDay[$r['day']] = (float) $r['revenue'];
        }
        $totalRevenue = array_sum($revenueByDay);

        $expenseByDay = $this->expenses->dailyTotals($id, $from, $to);
        $totalExpenses = array_sum($expenseByDay);

        $profit = round($totalRevenue - $totalExpenses, 2);
        $margin = $totalRevenue > 0 ? round($profit / $totalRevenue * 100, 1) : 0;

        $byCategory = $this->expenses->breakdownByCategory($id, $from, $to);
        $maxCategory = max(array_column($byCategory, 'total') ?: [0]);
        foreach ($byCategory as &$c) {
            $c['pct'] = $maxCategory > 0 ? round((float) $c['total'] / $maxCategory * 100, 1) : 0;
            $c['total'] = (float) $c['total'];
        }
        unset($c);

        // Merge revenue + expenses into a per-day profit series.
        $days = array_unique(array_merge(array_keys($revenueByDay), array_keys($expenseByDay)));
        sort($days);
        $daily = [];
        foreach ($days as $day) {
            $daily[] = [
                'day'       => $day,
                'revenue'   => round($revenueByDay[$day] ?? 0, 2),
                'expenses'  => round($expenseByDay[$day] ?? 0, 2),
                'profit'    => round(($revenueByDay[$day] ?? 0) - ($expenseByDay[$day] ?? 0), 2),
            ];
        }

        return api_success([
            'from'           => $from,
            'to'             => $to,
            'revenue'        => round($totalRevenue, 2),
            'total_expenses' => round($totalExpenses, 2),
            'expense_count'  => $this->expenses->where('vendor_id', $id)
                ->where('expense_date >=', $from)->where('expense_date <=', $to)->countAllResults(),
            'profit'         => $profit,
            'margin'         => $margin,
            'by_category'    => $byCategory,
            'daily'          => $daily,
        ]);
    }

    /**
     * POST /api/vendor/expenses
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'category'       => 'required|in_list[' . implode(',', ExpenseModel::CATEGORIES) . ']',
            'description'    => 'required|max_length[255]',
            'amount'         => 'required|decimal|greater_than[0]',
            'expense_date'   => 'required|valid_date',
            'payment_method' => 'permit_empty|in_list[cash,bank_transfer,card,wallet,other]',
            'reference'      => 'permit_empty|max_length[100]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('finance.manage');
            $user   = $this->currentUser();

            $id = $this->expenses->insert([
                'vendor_id'      => $vendor['id'],
                'category'       => $data['category'],
                'description'    => $data['description'],
                'amount'         => (float) $data['amount'],
                'expense_date'   => $data['expense_date'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference'      => $data['reference'] ?? null,
                'created_by'     => (int) $user['id'],
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'expense.created', 'Expense', $id, [
                'category' => $data['category'],
                'amount'   => (float) $data['amount'],
            ]);

            return api_success($this->expenses->find($id), 'Expense recorded successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/expenses/(:num)
     */
    public function update(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'category'       => 'required|in_list[' . implode(',', ExpenseModel::CATEGORIES) . ']',
            'description'    => 'required|max_length[255]',
            'amount'         => 'required|decimal|greater_than[0]',
            'expense_date'   => 'required|valid_date',
            'payment_method' => 'permit_empty|in_list[cash,bank_transfer,card,wallet,other]',
            'reference'      => 'permit_empty|max_length[100]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $expense = $this->expenses->find($id);
            if (! $expense || (int) $expense['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Expense not found.', 404);
            }

            $this->requirePermission('finance.manage');
            $this->expenses->update($id, [
                'category'       => $data['category'],
                'description'    => $data['description'],
                'amount'         => (float) $data['amount'],
                'expense_date'   => $data['expense_date'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference'      => $data['reference'] ?? null,
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'expense.updated', 'Expense', $id, [
                'amount' => (float) $data['amount'],
            ]);

            return api_success($this->expenses->find($id), 'Expense updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/expenses/(:num)
     */
    public function delete(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $expense = $this->expenses->find($id);
            if (! $expense || (int) $expense['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Expense not found.', 404);
            }

            $this->requirePermission('finance.manage');
            $this->expenses->delete($id);

            $this->audit()->vendorAction((int) $vendor['id'], 'expense.deleted', 'Expense', $id);

            return api_success(null, 'Expense deleted successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }
}

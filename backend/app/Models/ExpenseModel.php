<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * ExpenseModel - manages the expenses table (vendor operating costs).
 */
class ExpenseModel extends Model
{
    protected $table         = 'expenses';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'category', 'description', 'amount',
        'expense_date', 'payment_method', 'reference', 'created_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public const CATEGORIES = [
        'fuel', 'maintenance', 'salaries', 'terminal_fees', 'tolls',
        'insurance', 'licensing', 'marketing', 'utilities', 'other',
    ];

    /**
     * Expense rows for a vendor with optional period / category filters.
     */
    public function findByVendorId(int $vendorId, array $filters = [])
    {
        $query = $this->where('vendor_id', $vendorId);

        if (! empty($filters['from'])) {
            $query->where('expense_date >=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->where('expense_date <=', $filters['to']);
        }
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        return $query->orderBy('expense_date', 'DESC')->orderBy('id', 'DESC')->findAll();
    }

    /**
     * Total expense amount for a vendor in a date period.
     */
    public function totalForVendor(int $vendorId, string $from, string $to): float
    {
        $row = $this->select('COALESCE(SUM(amount),0) as total, COUNT(*) as count')
            ->where('vendor_id', $vendorId)
            ->where('expense_date >=', $from)
            ->where('expense_date <=', $to)
            ->first();

        return (float) ($row['total'] ?? 0);
    }

    /**
     * Expense totals grouped by category for a vendor in a date period.
     */
    public function breakdownByCategory(int $vendorId, string $from, string $to): array
    {
        return $this->select(
            'category, COALESCE(SUM(amount),0) as total, COUNT(*) as count'
        )
            ->where('vendor_id', $vendorId)
            ->where('expense_date >=', $from)
            ->where('expense_date <=', $to)
            ->groupBy('category')
            ->orderBy('total', 'DESC')
            ->findAll();
    }

    /**
     * Expense totals grouped by day for a vendor in a date period.
     */
    public function dailyTotals(int $vendorId, string $from, string $to): array
    {
        $rows = $this->select(
            'expense_date as day, COALESCE(SUM(amount),0) as expenses'
        )
            ->where('vendor_id', $vendorId)
            ->where('expense_date >=', $from)
            ->where('expense_date <=', $to)
            ->groupBy('expense_date')
            ->orderBy('expense_date', 'ASC')
            ->findAll();

        $map = [];
        foreach ($rows as $r) {
            $map[$r['day']] = (float) $r['expenses'];
        }
        return $map;
    }
}

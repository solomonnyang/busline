<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * VendorModel - manages the vendors table.
 */
class VendorModel extends Model
{
    protected $table         = 'vendors';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'user_id', 'terminal_id', 'type', 'company_name', 'company_email', 'company_phone',
        'address', 'city', 'country', 'logo', 'description',
        'approval_status', 'approved_by', 'approved_at',
        'website', 'established_year', 'license_number', 'tin', 'business_verified',
        'default_currency', 'timezone',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * Fetch a vendor record by user id.
     */
    public function findByUserId(int $userId)
    {
        return $this->where('user_id', $userId)->first();
    }

    /**
     * Vendors list with the associated user + approval status + terminals.
     */
    public function allWithUser()
    {
        $vendors = $this->select(
            'vendors.*, users.name, users.email, users.phone, users.is_active as user_active,
             terminals.name as terminal_name, terminals.city_id as terminal_city_id'
        )
            ->join('users', 'users.id = vendors.user_id', 'left')
            ->join('terminals', 'terminals.id = vendors.terminal_id', 'left')
            ->orderBy('vendors.created_at', 'DESC')
            ->findAll();

        return $this->attachTerminals($vendors);
    }

    /**
     * Single vendor with user + terminal info.
     */
    public function findWithUser(int $id)
    {
        $vendor = $this->select(
            'vendors.*, users.name, users.email, users.phone, users.is_active as user_active,
             terminals.name as terminal_name, terminals.city_id as terminal_city_id'
        )
            ->join('users', 'users.id = vendors.user_id', 'left')
            ->join('terminals', 'terminals.id = vendors.terminal_id', 'left')
            ->where('vendors.id', $id)
            ->first();

        if (! $vendor) {
            return null;
        }

        return $this->attachTerminals([$vendor])[0];
    }

    /**
     * Replace a vendor's terminal assignments with the given list.
     * Keeps vendors.terminal_id in sync as the primary terminal.
     */
    public function syncTerminals(int $vendorId, array $terminalIds): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $terminalIds), fn ($id) => $id > 0)));

        $db = \Config\Database::connect();
        $db->table('vendor_terminals')->where('vendor_id', $vendorId)->delete();

        $now = date('Y-m-d H:i:s');
        foreach ($ids as $tid) {
            $db->table('vendor_terminals')->insert([
                'vendor_id'   => $vendorId,
                'terminal_id' => $tid,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }

        $this->update($vendorId, ['terminal_id' => $ids[0] ?? null]);
    }

    /**
     * Terminal ids a vendor is registered to.
     */
    public function terminalIds(int $vendorId): array
    {
        $rows = \Config\Database::connect()
            ->table('vendor_terminals')
            ->select('terminal_id')
            ->where('vendor_id', $vendorId)
            ->get()->getResultArray();

        return array_map('intval', array_column($rows, 'terminal_id'));
    }

    /**
     * Full terminal records a vendor is registered to.
     */
    public function terminals(int $vendorId): array
    {
        return \Config\Database::connect()
            ->table('vendor_terminals as vt')
            ->select('t.id, t.name, t.city_id, c.name as city_name')
            ->join('terminals as t', 't.id = vt.terminal_id', 'left')
            ->join('cities as c', 'c.id = t.city_id', 'left')
            ->where('vt.vendor_id', $vendorId)
            ->orderBy('t.name', 'ASC')
            ->get()->getResultArray();
    }

    /**
     * Attach each vendor's terminal assignments as `terminals` and `terminal_ids`.
     */
    private function attachTerminals(array $vendors): array
    {
        if (empty($vendors)) {
            return $vendors;
        }

        $ids = array_values(array_unique(array_map('intval', array_column($vendors, 'id'))));

        $rows = \Config\Database::connect()
            ->table('vendor_terminals as vt')
            ->select('vt.vendor_id, t.id, t.name, t.city_id, c.name as city_name')
            ->join('terminals as t', 't.id = vt.terminal_id', 'left')
            ->join('cities as c', 'c.id = t.city_id', 'left')
            ->whereIn('vt.vendor_id', $ids)
            ->orderBy('t.name', 'ASC')
            ->get()->getResultArray();

        $map = [];
        foreach ($rows as $r) {
            $map[(int) $r['vendor_id']][] = [
                'id'        => (int) $r['id'],
                'name'      => $r['name'],
                'city_id'   => (int) $r['city_id'],
                'city_name' => $r['city_name'],
            ];
        }

        foreach ($vendors as &$vendor) {
            $vendor['terminals']    = $map[(int) $vendor['id']] ?? [];
            $vendor['terminal_ids'] = array_column($vendor['terminals'], 'id');
        }

        return $vendors;
    }
}

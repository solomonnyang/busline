<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * AuditLogModel - manages the audit_logs table.
 */
class AuditLogModel extends Model
{
    protected $table         = 'audit_logs';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['user_id', 'vendor_id', 'action', 'model_type', 'model_id', 'changes', 'ip_address', 'user_agent'];
    protected $useTimestamps = false;

    public function log(array $data): void
    {
        $this->insert([
            'user_id'    => $data['user_id'] ?? null,
            'vendor_id'  => $data['vendor_id'] ?? null,
            'action'     => $data['action'],
            'model_type' => $data['model_type'] ?? null,
            'model_id'   => $data['model_id'] ?? null,
            'changes'    => isset($data['changes']) ? json_encode($data['changes']) : null,
            'ip_address' => $data['ip_address'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function findByVendorId(int $vendorId, int $limit = 50)
    {
        $rows = $this->select(
            'audit_logs.*, users.name as user_name, users.email as user_email'
        )
            ->join('users', 'users.id = audit_logs.user_id', 'left')
            ->where('audit_logs.vendor_id', $vendorId)
            ->orderBy('audit_logs.id', 'DESC')
            ->findAll($limit);

        foreach ($rows as &$row) {
            $row['changes'] = json_decode($row['changes'] ?? 'null', true);
        }
        unset($row);

        return $rows;
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * LoginHistoryModel - manages the login_history table.
 */
class LoginHistoryModel extends Model
{
    protected $table         = 'login_history';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['user_id', 'ip_address', 'user_agent', 'device', 'location', 'is_success'];
    protected $useTimestamps = false;

    public function record(array $data): void
    {
        $this->insert([
            'user_id'    => $data['user_id'],
            'ip_address' => $data['ip_address'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
            'device'     => $data['device'] ?? null,
            'location'   => $data['location'] ?? null,
            'is_success' => $data['is_success'] ?? 1,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function forUser(int $userId, int $limit = 50)
    {
        return $this->where('user_id', $userId)->orderBy('id', 'DESC')->findAll($limit);
    }

    public function countFailedAfter(int $userId, string $since): int
    {
        return $this->where('user_id', $userId)
            ->where('is_success', 0)
            ->where('created_at >=', $since)
            ->countAllResults();
    }
}

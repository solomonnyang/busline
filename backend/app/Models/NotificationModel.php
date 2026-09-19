<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * NotificationModel - manages the notifications table.
 */
class NotificationModel extends Model
{
    protected $table         = 'notifications';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['user_id', 'type', 'title', 'message', 'data', 'is_read', 'read_at'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function forUser(int $userId, int $limit = 20)
    {
        $rows = $this->where('user_id', $userId)
            ->orderBy('id', 'DESC')
            ->findAll($limit);

        foreach ($rows as &$row) {
            $row['data'] = json_decode($row['data'] ?? 'null', true);
        }
        unset($row);

        return $rows;
    }

    public function unreadCount(int $userId): int
    {
        return $this->where('user_id', $userId)->where('is_read', 0)->countAllResults();
    }

    public function markAllRead(int $userId): void
    {
        $this->where('user_id', $userId)->where('is_read', 0)
            ->set(['is_read' => 1, 'read_at' => date('Y-m-d H:i:s')])
            ->update();
    }
}

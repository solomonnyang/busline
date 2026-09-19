<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * AdminActivityModel - manages the admin_activities table.
 * Realtime website activity shown in the admin notification bell.
 */
class AdminActivityModel extends Model
{
    protected $table         = 'admin_activities';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['type', 'title', 'message', 'data', 'is_read', 'read_at'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function recent(int $limit = 25)
    {
        $rows = $this->orderBy('id', 'DESC')->findAll($limit);

        foreach ($rows as &$row) {
            $row['data'] = json_decode($row['data'] ?? 'null', true);
            $row['time_ago'] = $this->timeAgo($row['created_at']);
        }
        unset($row);

        return $rows;
    }

    public function unreadCount(): int
    {
        return $this->where('is_read', 0)->countAllResults();
    }

    public function markAllRead(): int
    {
        return $this->where('is_read', 0)
            ->set(['is_read' => 1, 'read_at' => date('Y-m-d H:i:s')])
            ->update();
    }

    protected function timeAgo(?string $datetime): string
    {
        if (! $datetime) {
            return '';
        }
        $diff = time() - strtotime($datetime);
        if ($diff < 60) {
            return 'just now';
        }
        if ($diff < 3600) {
            return (int) floor($diff / 60) . 'm ago';
        }
        if ($diff < 86400) {
            return (int) floor($diff / 3600) . 'h ago';
        }
        return (int) floor($diff / 86400) . 'd ago';
    }
}

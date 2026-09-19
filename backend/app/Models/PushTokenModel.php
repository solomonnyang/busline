<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * PushTokenModel - manages the push_tokens table.
 * Stores the Expo push tokens a user's devices have registered.
 */
class PushTokenModel extends Model
{
    protected $table         = 'push_tokens';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['user_id', 'token', 'platform', 'device', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function activeTokensForUser(int $userId): array
    {
        return $this->where('user_id', $userId)
            ->where('is_active', 1)
            ->findAll();
    }

    public function activeTokensForUsers(array $userIds): array
    {
        if (empty($userIds)) {
            return [];
        }
        return $this->whereIn('user_id', $userIds)
            ->where('is_active', 1)
            ->findAll();
    }

    public function findByToken(string $token): ?array
    {
        $row = $this->where('token', $token)->first();
        return $row ?: null;
    }

    public function deactivate(int $id): void
    {
        $this->update($id, ['is_active' => 0]);
    }
}

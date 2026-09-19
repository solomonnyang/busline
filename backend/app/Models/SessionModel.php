<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * SessionModel - manages the sessions table (active JWT sessions).
 */
class SessionModel extends Model
{
    protected $table         = 'sessions';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['user_id', 'token_hash', 'device', 'ip_address', 'user_agent', 'expires_at', 'is_active', 'last_activity_at'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByHash(string $hash)
    {
        return $this->where('token_hash', $hash)->first();
    }

    public function activeForUser(int $userId)
    {
        return $this->where('user_id', $userId)->where('is_active', 1)->orderBy('id', 'DESC')->findAll();
    }

    public function revoke(int $sessionId): void
    {
        $this->update($sessionId, ['is_active' => 0]);
    }

    public function revokeAllForUser(int $userId, ?int $exceptId = null): void
    {
        $builder = $this->where('user_id', $userId)->where('is_active', 1);
        if ($exceptId) {
            $builder->where('id !=', $exceptId);
        }
        $builder->set(['is_active' => 0])->update();
    }

    /**
     * Deactivate expired sessions.
     */
    public function expireAll(): void
    {
        $this->where('is_active', 1)
            ->where('expires_at <', date('Y-m-d H:i:s'))
            ->set(['is_active' => 0])
            ->update();
    }
}

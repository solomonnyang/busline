<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * PasswordResetModel - manages the password_resets table.
 */
class PasswordResetModel extends Model
{
    protected $table         = 'password_resets';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['email', 'token', 'created_at'];
    protected $useTimestamps = false;

    /**
     * Look up an unexpired reset token for an email.
     */
    public function findValid(string $email, string $tokenHash, int $ttl = 3600)
    {
        return $this->where('email', $email)
            ->where('token', $tokenHash)
            ->where('created_at >', date('Y-m-d H:i:s', time() - $ttl))
            ->first();
    }

    /**
     * Delete all reset tokens for an email (used after a successful reset).
     */
    public function deleteForEmail(string $email): void
    {
        $this->where('email', $email)->delete();
    }
}

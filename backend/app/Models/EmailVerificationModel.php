<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * EmailVerificationModel - manages the email_verifications table.
 */
class EmailVerificationModel extends Model
{
    protected $table         = 'email_verifications';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['email', 'code', 'created_at'];
    protected $useTimestamps = false;

    /**
     * Look up an unexpired verification code for an email.
     */
    public function findValid(string $email, string $codeHash, int $ttl = 86400)
    {
        return $this->where('email', $email)
            ->where('code', $codeHash)
            ->where('created_at >', date('Y-m-d H:i:s', time() - $ttl))
            ->first();
    }

    /**
     * Delete all verification codes for an email (used after a successful verify).
     */
    public function deleteForEmail(string $email): void
    {
        $this->where('email', $email)->delete();
    }
}

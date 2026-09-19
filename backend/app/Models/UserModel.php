<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * UserModel - manages the users table.
 */
class UserModel extends Model
{
    protected $table         = 'users';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $protectFields = true;
    protected $allowedFields = [
        'name', 'email', 'phone', 'password', 'role_id',
        'avatar', 'is_active', 'email_verified_at', 'remember_token',
        'two_factor_secret', 'two_factor_enabled', 'two_factor_backup_codes',
        'referral_code', 'referred_by',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';
    protected $beforeInsert  = ['hashPassword'];
    protected $beforeUpdate  = ['hashPassword'];

    /**
     * Hash password automatically on insert/update.
     */
    protected function hashPassword(array $data)
    {
        if (isset($data['data']['password']) && ! empty($data['data']['password'])) {
            $data['data']['password'] = password_hash($data['data']['password'], PASSWORD_DEFAULT);
        }
        return $data;
    }

    /**
     * Find a user by email (including soft-deleted filtering handled automatically).
     */
    public function findByEmail(string $email)
    {
        return $this->where('email', $email)->first();
    }

    /**
     * Fetch a user together with role + vendor profile in one query.
     */
    public function getUserWithProfile(int $userId)
    {
        return $this->select('users.*, roles.name as role_name, roles.slug as role_slug')
            ->join('roles', 'roles.id = users.role_id', 'left')
            ->where('users.id', $userId)
            ->first();
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * CustomerModel - manages the customers table.
 */
class CustomerModel extends Model
{
    protected $table         = 'customers';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'user_id', 'address', 'city', 'country', 'date_of_birth', 'gender',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByUserId(int $userId)
    {
        return $this->where('user_id', $userId)->first();
    }

    /**
     * All customers joined with their user account.
     */
    public function allWithUser()
    {
        return $this->select(
            'customers.*, users.name as name, users.email as email, users.phone as phone, users.created_at as registered_at'
        )
            ->join('users', 'users.id = customers.user_id', 'left')
            ->orderBy('customers.created_at', 'DESC')
            ->findAll();
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * RoleModel - manages the roles table.
 */
class RoleModel extends Model
{
    protected $table         = 'roles';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = ['name', 'slug', 'description'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findBySlug(string $slug)
    {
        return $this->where('slug', $slug)->first();
    }
}

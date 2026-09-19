<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * CityModel - manages the cities table.
 */
class CityModel extends Model
{
    protected $table         = 'cities';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = ['name', 'state', 'lat', 'lng', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function active()
    {
        return $this->where('is_active', 1)->orderBy('name', 'ASC')->findAll();
    }
}

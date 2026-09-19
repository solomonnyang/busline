<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * BusCategoryModel - manages the bus_categories table.
 * Admin-managed bus classes vendors pick from when creating buses.
 */
class BusCategoryModel extends Model
{
    protected $table         = 'bus_categories';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['name', 'slug', 'description', 'image', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findActive()
    {
        return $this->where('is_active', 1)->orderBy('name', 'ASC')->findAll();
    }

    public function findBySlug(string $slug): ?array
    {
        return $this->where('slug', $slug)->where('is_active', 1)->first();
    }
}

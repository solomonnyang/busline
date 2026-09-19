<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * TerminalModel - manages the terminals table.
 */
class TerminalModel extends Model
{
    protected $table         = 'terminals';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'city_id', 'name', 'address', 'lat', 'lng', 'photo_url', 'amenities', 'is_active',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    /**
     * Terminals enriched with their city name.
     */
    public function withCity()
    {
        return $this->select('terminals.*, cities.name as city_name, cities.state as city_state')
            ->join('cities', 'cities.id = terminals.city_id', 'left')
            ->where('terminals.is_active', 1)
            ->orderBy('terminals.name', 'ASC');
    }

    /**
     * Search terminals by keyword across name/address/city.
     */
    public function search(string $q)
    {
        return $this->withCity()
            ->groupStart()
            ->like('terminals.name', $q)
            ->orLike('terminals.address', $q)
            ->orLike('cities.name', $q)
            ->orLike('cities.state', $q)
            ->groupEnd()
            ->findAll();
    }
}

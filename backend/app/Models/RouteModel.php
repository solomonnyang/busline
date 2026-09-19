<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * RouteModel - manages the routes table.
 */
class RouteModel extends Model
{
    protected $table         = 'routes';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'origin_city_id', 'destination_city_id',
        'distance_km', 'estimated_duration', 'status',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByVendorId(int $vendorId)
    {
        return $this->where('vendor_id', $vendorId)->orderBy('id', 'DESC')->findAll();
    }

    /**
     * Routes with origin/destination city names and vendor info.
     */
    public function allDetailed(?int $vendorId = null)
    {
        $query = $this->select(
            'routes.*,
             origin.name as origin_city, origin.state as origin_state,
             destination.name as destination_city, destination.state as destination_state,
             vendors.company_name as vendor_name'
        )
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('vendors', 'vendors.id = routes.vendor_id', 'left')
            ->orderBy('routes.id', 'DESC');

        if ($vendorId !== null) {
            $query->where('routes.vendor_id', $vendorId);
        }

        return $query->findAll();
    }
}

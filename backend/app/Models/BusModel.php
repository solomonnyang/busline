<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * BusModel - manages the buses table.
 */
class BusModel extends Model
{
    protected $table         = 'buses';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'terminal_id', 'bus_name', 'registration_number', 'bus_type', 'category_id',
        'total_seats', 'seat_layout', 'status', 'manufacturer', 'model', 'year',
        'amenities', 'photos', 'notes',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByVendorId(int $vendorId)
    {
        return $this->select('buses.*, terminals.name as terminal_name, bus_categories.name as category_name')
            ->join('terminals', 'terminals.id = buses.terminal_id', 'left')
            ->join('bus_categories', 'bus_categories.id = buses.category_id', 'left')
            ->where('buses.vendor_id', $vendorId)
            ->orderBy('buses.id', 'DESC')
            ->findAll();
    }

    /**
     * Bus with vendor company name.
     */
    public function allWithVendor()
    {
        return $this->select(
            'buses.*, vendors.company_name as vendor_name, vendors.approval_status as vendor_approval,
             terminals.name as terminal_name, bus_categories.name as category_name'
        )
            ->join('vendors', 'vendors.id = buses.vendor_id', 'left')
            ->join('terminals', 'terminals.id = buses.terminal_id', 'left')
            ->join('bus_categories', 'bus_categories.id = buses.category_id', 'left')
            ->orderBy('buses.created_at', 'DESC')
            ->findAll();
    }
}

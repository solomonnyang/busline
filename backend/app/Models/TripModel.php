<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * TripModel - manages the trips table.
 */
class TripModel extends Model
{
    protected $table         = 'trips';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'vendor_id', 'bus_id', 'route_id', 'terminal_id', 'departure_date',
        'departure_time', 'arrival_time', 'price', 'available_seats', 'status',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByVendorId(int $vendorId, array $filters = [])
    {
        $query = $this->where('vendor_id', $vendorId);

        if (! empty($filters['status'])) {
            $query->where('trips.status', $filters['status']);
        }
        if (! empty($filters['route_id'])) {
            $query->where('trips.route_id', (int) $filters['route_id']);
        }
        if (! empty($filters['bus_id'])) {
            $query->where('trips.bus_id', (int) $filters['bus_id']);
        }

        return $query->orderBy('departure_date', 'DESC')->findAll();
    }

    /**
     * Full trip details with bus, route, and vendor information.
     */
    public function detailed(int $tripId)
    {
        return $this->select(
            '             trips.*,
             trips.terminal_id as trip_terminal_id,
             buses.bus_name, buses.bus_type, buses.registration_number, buses.seat_layout, buses.total_seats,
             buses.terminal_id as bus_terminal_raw_id,
             bus_categories.name as category_name, bus_categories.image as category_image,
             COALESCE(trips.terminal_id, buses.terminal_id) as bus_terminal_id,
             COALESCE(trips.terminal_id, buses.terminal_id) as terminal_id,
             terminal.name as bus_terminal_name,
             terminal.address as bus_terminal_address,
             terminal.city_id as bus_terminal_city_id,
             terminal_city.name as bus_terminal_city,
             routes.origin_city_id, routes.destination_city_id,
             origin.name as origin_city, destination.name as destination_city,
             vendors.company_name as vendor_name, vendors.company_phone as vendor_phone'
        )
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('bus_categories', 'bus_categories.id = buses.category_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('terminals as terminal', 'terminal.id = COALESCE(trips.terminal_id, buses.terminal_id)', 'left')
            ->join('cities as terminal_city', 'terminal_city.id = terminal.city_id', 'left')
            ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
            ->where('trips.id', $tripId)
            ->first();
    }

    /**
     * Search trips by origin/destination city + departure date.
     */
    public function search(?int $origin = null, ?int $destination = null, ?string $date = null)
    {
        $query = $this->select(
            '             trips.*,
             trips.terminal_id as trip_terminal_id,
             buses.bus_name, buses.bus_type, buses.registration_number, buses.seat_layout, buses.total_seats,
             buses.terminal_id as bus_terminal_raw_id,
             bus_categories.name as category_name, bus_categories.image as category_image,
             COALESCE(trips.terminal_id, buses.terminal_id) as bus_terminal_id,
             terminal.name as bus_terminal_name,
             terminal.address as bus_terminal_address,
             terminal.city_id as bus_terminal_city_id,
             terminal_city.name as bus_terminal_city,
             routes.origin_city_id, routes.destination_city_id,
             origin.name as origin_city, destination.name as destination_city,
             vendors.company_name as vendor_name, vendors.logo as vendor_logo,
             vendors.company_phone as vendor_phone,
             vendors.terminal_id as vendor_terminal_id'
        )
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('bus_categories', 'bus_categories.id = buses.category_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('terminals as terminal', 'terminal.id = COALESCE(trips.terminal_id, buses.terminal_id)', 'left')
            ->join('cities as terminal_city', 'terminal_city.id = terminal.city_id', 'left')
            ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
            ->where('trips.status', 'scheduled')
            ->where('buses.status', 'active')
            ->where('vendors.approval_status', 'approved');

        if ($origin) {
            $query->where('routes.origin_city_id', $origin);
        }
        if ($destination) {
            $query->where('routes.destination_city_id', $destination);
        }
        if ($date) {
            $query->where('trips.departure_date', $date);
        } else {
            $query->where('trips.departure_date >=', date('Y-m-d'));
        }

        return $query->orderBy('trips.departure_date', 'ASC')
            ->orderBy('trips.departure_time', 'ASC')
            ->findAll();
    }
}

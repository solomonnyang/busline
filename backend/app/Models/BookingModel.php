<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * BookingModel - manages the bookings table.
 */
class BookingModel extends Model
{
    protected $table         = 'bookings';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'booking_number', 'customer_id', 'trip_id', 'booking_date',
        'total_amount', 'seat_count', 'status', 'payment_status',
        'qr_code', 'checked_in', 'checked_in_at',
        'discount_type', 'discount_amount',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    public function findByCustomerId(int $customerId)
    {
        return $this->where('customer_id', $customerId)->orderBy('id', 'DESC')->findAll();
    }

    public function findByBookingNumber(string $number)
    {
        return $this->where('booking_number', $number)->first();
    }

    /**
     * Booking details including trip, bus, route, and passenger seats.
     */
    public function detailed(int $bookingId)
    {
        return $this->select(
            'bookings.*,
             trips.departure_date, trips.departure_time, trips.arrival_time, trips.price as trip_price,
             buses.bus_name, buses.bus_type, buses.registration_number,
             origin.name as origin_city, origin.lat as origin_lat, origin.lng as origin_lng,
             destination.name as destination_city, destination.lat as destination_lat, destination.lng as destination_lng,
             vendors.company_name as vendor_name, vendors.logo as vendor_logo,
             vendors.company_phone as vendor_phone'
        )
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
            ->where('bookings.id', $bookingId)
            ->first();
    }

    /**
     * Count bookings per status (used by dashboards).
     */
    public function countByStatus(?int $vendorId = null)
    {
        $builder = $this->select('status, COUNT(*) as total')->groupBy('status');
        if ($vendorId) {
            $builder->join('trips', 'trips.id = bookings.trip_id', 'left')->where('trips.vendor_id', $vendorId);
        }
        return $builder->findAll();
    }
}

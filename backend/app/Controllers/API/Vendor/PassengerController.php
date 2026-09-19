<?php

namespace App\Controllers\API\Vendor;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * PassengerController
 * Searchable passenger list derived from booking_seats across the vendor's
 * trips, plus passenger detail.
 */
class PassengerController extends BaseVendorController
{
    /**
     * GET /api/vendor/passengers?search=&trip_id=&limit=
     * One row per booked seat (passenger) on the vendor's trips.
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();

        $db = \Config\Database::connect();
        $query = $db->table('booking_seats as bs')
            ->select(
                'bs.id, bs.passenger_name, bs.passenger_age, bs.passenger_gender, bs.ticket_price,
                 bs.seat_id, seats.seat_number,
                 bookings.id as booking_id, bookings.booking_number, bookings.status as booking_status,
                 bookings.payment_status, bookings.booking_date,
                 trips.id as trip_id, trips.departure_date, trips.departure_time,
                 origin.name as origin_city, destination.name as destination_city,
                 buses.bus_name'
            )
            ->join('seats', 'seats.id = bs.seat_id', 'left')
            ->join('bookings', 'bookings.id = bs.booking_id', 'inner')
            ->join('trips', 'trips.id = bs.trip_id', 'inner')
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('trips.vendor_id', (int) $vendor['id']);

        $search = trim((string) $this->request->getGet('search'));
        if ($search !== '') {
            $query->groupStart()
                ->like('bs.passenger_name', $search)
                ->orLike('bookings.booking_number', $search)
                ->groupEnd();
        }
        if ($tripId = (int) $this->request->getGet('trip_id')) {
            $query->where('bs.trip_id', $tripId);
        }
        if ($status = trim((string) $this->request->getGet('status'))) {
            $query->where('bookings.status', $status);
        }

        $limit = min(200, max(1, (int) ($this->request->getGet('limit') ?: 50)));
        $rows = $query->orderBy('bs.id', 'DESC')->limit($limit)->get()->getResultArray();

        return api_success($rows);
    }

    /**
     * GET /api/vendor/passengers/(:num)
     * Passenger detail: the selected seat row + its booking + the customer.
     */
    public function show(int $id): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();

        $db = \Config\Database::connect();
        $row = $db->table('booking_seats as bs')
            ->select(
                'bs.*, seats.seat_number, seats.seat_row, seats.seat_column,
                 bookings.booking_number, bookings.status as booking_status,
                 bookings.payment_status, bookings.booking_date,
                 bookings.customer_id,
                 users.name as customer_name, users.phone as customer_phone,
                 trips.departure_date, trips.departure_time,
                 origin.name as origin_city, destination.name as destination_city,
                 buses.bus_name, buses.registration_number'
            )
            ->join('seats', 'seats.id = bs.seat_id', 'left')
            ->join('bookings', 'bookings.id = bs.booking_id', 'left')
            ->join('customers', 'customers.id = bookings.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->join('trips', 'trips.id = bs.trip_id', 'left')
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('bs.id', $id)
            ->where('trips.vendor_id', (int) $vendor['id'])
            ->get()
            ->getRowArray();

        if (! $row) {
            return api_error('Passenger not found.', 404);
        }

        return api_success($row);
    }
}

<?php

namespace App\Controllers\API\Vendor;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * AnalyticsController
 * Vendor-scoped booking/revenue analytics with date-range filters.
 */
class AnalyticsController extends BaseVendorController
{
    /**
     * GET /api/vendor/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $id     = (int) $vendor['id'];

        $from = trim((string) $this->request->getGet('from'));
        $to   = trim((string) $this->request->getGet('to'));
        if ($from === '' || ! strtotime($from)) {
            $from = date('Y-m-d', strtotime('-30 days'));
        }
        if ($to === '' || ! strtotime($to)) {
            $to = date('Y-m-d');
        }

        $db = \Config\Database::connect();
        $fromStart = $from . ' 00:00:00';
        $toEnd     = $to . ' 23:59:59';

        // Daily booking + revenue trend.
        $trend = $db->table('bookings')
            ->select("DATE(bookings.created_at) as day, COUNT(*) as bookings, COALESCE(SUM(bookings.total_amount),0) as revenue")
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('bookings.created_at >=', $fromStart)
            ->where('bookings.created_at <=', $toEnd)
            ->where('bookings.status !=', 'cancelled')
            ->groupBy('day')
            ->orderBy('day', 'ASC')
            ->get()->getResultArray();

        // Revenue by route.
        $byRoute = $db->table('bookings')
            ->select(
                'routes.id as route_id, origin.name as origin_city, destination.name as destination_city,
                 COUNT(bookings.id) as bookings, COALESCE(SUM(bookings.total_amount),0) as revenue'
            )
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('bookings.created_at >=', $fromStart)
            ->where('bookings.created_at <=', $toEnd)
            ->where('bookings.status !=', 'cancelled')
            ->groupBy('trips.route_id')
            ->orderBy('revenue', 'DESC')
            ->get()->getResultArray();

        // Revenue by bus.
        $byBus = $db->table('bookings')
            ->select(
                'buses.id as bus_id, buses.bus_name, buses.registration_number,
                 COUNT(bookings.id) as bookings, COALESCE(SUM(bookings.total_amount),0) as revenue'
            )
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('bookings.created_at >=', $fromStart)
            ->where('bookings.created_at <=', $toEnd)
            ->where('bookings.status !=', 'cancelled')
            ->groupBy('trips.bus_id')
            ->orderBy('revenue', 'DESC')
            ->get()->getResultArray();

        // Booking status distribution.
        $statusDist = $db->table('bookings')
            ->select('bookings.status, COUNT(*) as total')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('bookings.created_at >=', $fromStart)
            ->where('bookings.created_at <=', $toEnd)
            ->groupBy('bookings.status')
            ->get()->getResultArray();

        // Overall occupancy across the vendor's trips in range.
        $occupancy = $db->table('trips')
            ->select(
                'COUNT(trips.id) as trip_count,
                 COALESCE(SUM(buses.total_seats),0) as total_capacity,
                 COALESCE(SUM(buses.total_seats) - SUM(trips.available_seats),0) as filled'
            )
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('trips.departure_date >=', $from)
            ->where('trips.departure_date <=', $to)
            ->get()->getRowArray();

        // Totals (non-cancelled).
        $totals = $db->table('bookings')
            ->select(
                'COUNT(*) as bookings,
                 COALESCE(SUM(bookings.total_amount),0) as revenue,
                 COALESCE(SUM(bookings.seat_count),0) as passengers'
            )
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->where('trips.vendor_id', $id)
            ->where('bookings.created_at >=', $fromStart)
            ->where('bookings.created_at <=', $toEnd)
            ->where('bookings.status !=', 'cancelled')
            ->get()->getRowArray();

        return api_success([
            'from'        => $from,
            'to'          => $to,
            'totals'      => [
                'bookings'    => (int) ($totals['bookings'] ?? 0),
                'revenue'     => (float) ($totals['revenue'] ?? 0),
                'passengers'  => (int) ($totals['passengers'] ?? 0),
                'avg_ticket'  => (int) ($totals['bookings'] ?? 0) > 0 ? round((float) $totals['revenue'] / (int) $totals['bookings'], 2) : 0,
            ],
            'trend'       => $trend,
            'by_route'    => $byRoute,
            'by_bus'      => $byBus,
            'status_dist' => $statusDist,
            'occupancy'   => [
                'trip_count'     => (int) ($occupancy['trip_count'] ?? 0),
                'total_capacity' => (int) ($occupancy['total_capacity'] ?? 0),
                'filled'         => (int) ($occupancy['filled'] ?? 0),
                'rate'           => (int) ($occupancy['total_capacity'] ?? 0) > 0 ? round((float) $occupancy['filled'] / (int) $occupancy['total_capacity'] * 100, 1) : 0,
            ],
        ]);
    }
}

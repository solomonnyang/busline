<?php

namespace App\Controllers\API;

use App\Models\DriverModel;
use App\Models\StaffModel;
use App\Models\TripDriverModel;
use App\Models\TripModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * DriverController
 * Endpoints for logged-in fleet drivers: their assigned trips and trip detail.
 * A driver is a vendor_staff member whose staff record has role 'driver' and is
 * linked to a drivers record via staff_id.
 */
class DriverController extends BaseApiController
{
    /**
     * Resolve the authenticated user's driver record (via staff → driver).
     * Returns null when the user is not a registered driver.
     */
    private function currentDriver(): ?array
    {
        $user = $this->currentUser();

        $staff = model(StaffModel::class)->findByUserId((int) $user['id']);
        if (! $staff) {
            return null;
        }

        $driver = model(DriverModel::class)->findByStaffId((int) $staff['id']);
        if (! $driver) {
            return null;
        }

        $driver['staff_role'] = $staff['role'] ?? null;
        $driver['vendor_id']  = (int) $driver['vendor_id'];

        return $driver;
    }

    /**
     * GET /api/driver/trips
     * The trips assigned to the logged-in driver, newest first.
     * Optional ?status= filter (scheduled|in_progress|completed|cancelled).
     */
    public function trips(): ResponseInterface
    {
        $driver = $this->currentDriver();
        if (! $driver) {
            return api_error('Driver profile not found for this account.', 403);
        }

        $status = $this->request->getGet('status');
        $limit  = (int) $this->request->getGet('limit') ?: 200;

        $assignments = model(TripDriverModel::class)
            ->select('trip_drivers.*')
            ->where('driver_id', (int) $driver['id'])
            ->orderBy('trip_drivers.id', 'DESC')
            ->findAll($limit);

        $result = [];
        foreach ($assignments as $assignment) {
            $trip = model(TripModel::class)->find((int) $assignment['trip_id']);
            if (! $trip || $trip['deleted_at'] !== null) {
                continue;
            }
            if (! empty($status) && $trip['status'] !== $status) {
                continue;
            }

            $detail = model(TripModel::class)->detailed((int) $trip['id']);
            $detail['driver_role'] = $assignment['role'];
            $detail['assigned_at'] = $assignment['created_at'];

            // Passenger count for the driver's trip roster.
            $detail['passenger_count'] = (int) model(\App\Models\BookingSeatModel::class)
                ->join('bookings', 'bookings.id = booking_seats.booking_id', 'left')
                ->where('bookings.trip_id', (int) $trip['id'])
                ->whereIn('bookings.status', ['pending', 'confirmed'])
                ->countAllResults();

            $result[] = $detail;
        }

        return api_success($result);
    }

    /**
     * GET /api/driver/trips/{id}
     * Detail for one of the driver's assigned trips.
     */
    public function tripDetail(int $id): ResponseInterface
    {
        $driver = $this->currentDriver();
        if (! $driver) {
            return api_error('Driver profile not found for this account.', 403);
        }

        $assignment = model(TripDriverModel::class)
            ->where('trip_id', $id)
            ->where('driver_id', (int) $driver['id'])
            ->first();
        if (! $assignment) {
            return api_error('This trip is not assigned to you.', 404);
        }

        $trip = model(TripModel::class)->find($id);
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        try {
            $map = (new \App\Services\BookingService())->seatMap($id);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }

        return api_success([
            'trip'       => $map['trip'],
            'seats'      => $map['seats'],
            'layout'     => $map['layout'],
            'driver_role' => $assignment['role'],
            'assigned_at' => $assignment['created_at'],
            'bookings'   => model(\App\Models\BookingModel::class)
                ->select('bookings.*, users.name as customer_name, users.email as customer_email')
                ->join('customers', 'customers.id = bookings.customer_id', 'left')
                ->join('users', 'users.id = customers.user_id', 'left')
                ->where('bookings.trip_id', $id)
                ->orderBy('bookings.created_at', 'DESC')
                ->findAll(),
        ]);
    }
}

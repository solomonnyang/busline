<?php

namespace App\Controllers\API;

use App\Services\BookingService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * BookingController
 * Customer-facing booking workflow: seat maps, create booking,
 * list bookings, ticket download, payment verification.
 */
class BookingController extends BaseApiController
{
    protected BookingService $bookingService;

    public function __construct()
    {
        $this->bookingService = new BookingService();
    }

    /**
     * GET /api/trips/{id}/seats
     * Public seat map for a trip (availability included).
     */
    public function seats(int $tripId): ResponseInterface
    {
        try {
            $map = $this->bookingService->seatMap($tripId);
            return api_success($map);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 404);
        }
    }

    /**
     * POST /api/bookings
     * Create a booking. Body:
     * { trip_id, payment_method: cash|paystack, seats: [id,...],
     *   passengers: [{name,age,gender,price?}, ...], callback_url? }
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'trip_id'        => 'required|is_natural_no_zero',
            'payment_method' => 'required|in_list[cash,paystack,wallet]',
            'seats'          => 'required',
            'passengers'     => 'required',
            'callback_url'   => 'permit_empty|valid_url_like',
        ]);

        $customer = $this->currentCustomer();

        try {
            $result = $this->bookingService->create(
                $customer,
                (int) $data['trip_id'],
                array_map('intval', (array) $data['seats']),
                (array) $data['passengers'],
                $data['payment_method'],
                $data['callback_url'] ?? ''
            );
            $booking = $result['booking'] ?? [];
            $actorName = $this->currentUser()['name'] ?? 'A customer';
            (new \App\Services\AdminActivityService())->record(
                'booking',
                'New booking #' . ($booking['booking_number'] ?? ''),
                "{$actorName} booked " . (int) ($booking['seat_count'] ?? 0) . " seat(s) for ₦" . number_format((float) ($booking['total_amount'] ?? 0), 2) . ".",
                ['booking_id' => (int) ($booking['id'] ?? 0), 'booking_number' => $booking['booking_number'] ?? null]
            );
            return api_success($result, 'Booking created successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/bookings
     * Authenticated customer's booking history.
     */
    public function index(): ResponseInterface
    {
        $customer = $this->currentCustomer();
        $bookings = model(\App\Models\BookingModel::class)->findByCustomerId((int) $customer['id']);

        $result = array_map(function ($booking) {
            $detail = model(\App\Models\BookingModel::class)->detailed((int) $booking['id']);
            $detail['seats'] = model(\App\Models\BookingSeatModel::class)->findByBookingId((int) $booking['id']);
            return $detail;
        }, $bookings);

        return api_success($result);
    }

    /**
     * GET /api/bookings/{id}
     * Single booking detail for the owner.
     */
    public function show(int $id): ResponseInterface
    {
        $customer = $this->currentCustomer();
        $booking = model(\App\Models\BookingModel::class)->find($id);

        if (! $booking || (int) $booking['customer_id'] !== (int) $customer['id']) {
            return api_error('Booking not found.', 404);
        }

        return api_success($this->bookingService->ticket($id));
    }

    /**
     * GET /api/bookings/{id}/ticket
     * Printable ticket with QR code.
     */
    public function ticket(int $id): ResponseInterface
    {
        $customer = $this->currentCustomer();
        $booking = model(\App\Models\BookingModel::class)->find($id);

        if (! $booking || (int) $booking['customer_id'] !== (int) $customer['id']) {
            return api_error('Booking not found.', 404);
        }

        return api_success($this->bookingService->ticket($id, true));
    }

    /**
     * GET /api/payments
     * Authenticated customer's payment history.
     */
    public function payments(): ResponseInterface
    {
        $customer = $this->currentCustomer();
        $rows = \Config\Database::connect()->table('payments')
            ->select(
                'payments.*, bookings.booking_number, bookings.booking_date,
                 origin.name as origin_city, destination.name as destination_city'
            )
            ->join('bookings', 'bookings.id = payments.booking_id', 'left')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('bookings.customer_id', (int) $customer['id'])
            ->orderBy('payments.id', 'DESC')
            ->get()
            ->getResultArray();

        return api_success($rows);
    }

    /**
     * POST /api/payments/verify
     * Verify a Paystack transaction after redirect.
     * Body: { reference }
     */
    public function verifyPayment(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'reference' => 'required',
        ]);

        try {
            $customer = $this->currentCustomer();
            $ticket = $this->bookingService->verifyPayment($data['reference'], (int) $customer['id']);
            $booking = $ticket['booking'] ?? [];
            (new \App\Services\AdminActivityService())->record(
                'payment',
                'Payment received',
                "Payment of ₦" . number_format((float) ($booking['total_amount'] ?? 0), 2) . " confirmed for booking #" . ($booking['booking_number'] ?? ''),
                ['booking_id' => (int) ($booking['id'] ?? 0), 'booking_number' => $booking['booking_number'] ?? null]
            );
            return api_success($ticket, 'Payment verified successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/payments/status/{reference}
     * Safe status poll for a booking payment while the checkout is open.
     * Only reconciles to success; never marks a payment failed.
     */
    public function paymentStatus($reference): ResponseInterface
    {
        try {
            $customer = $this->currentCustomer();
            $result = $this->bookingService->paymentStatus($reference, (int) $customer['id']);
            return api_success($result);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 404);
        }
    }

    /**
     * POST /api/bookings/{id}/cancel
     * Customer can cancel a pending/confirmed booking (service handles refunds).
     */
    public function cancel(int $id): ResponseInterface
    {
        $customer = $this->currentCustomer();
        $booking = model(\App\Models\BookingModel::class)->find($id);

        if (! $booking || (int) $booking['customer_id'] !== (int) $customer['id']) {
            return api_error('Booking not found.', 404);
        }

        try {
            $ticket = $this->bookingService->cancel($id);
            $booking = $ticket['booking'] ?? [];
            (new \App\Services\AdminActivityService())->record(
                'cancellation',
                'Booking cancelled',
                "Booking #" . ($booking['booking_number'] ?? '') . " was cancelled.",
                ['booking_id' => (int) ($booking['id'] ?? 0), 'booking_number' => $booking['booking_number'] ?? null]
            );
            return api_success($ticket, 'Booking cancelled.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }
}

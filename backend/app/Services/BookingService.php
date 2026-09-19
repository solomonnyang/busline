<?php

namespace App\Services;

use App\Models\BookingModel;
use App\Models\BookingSeatModel;
use App\Models\CustomerModel;
use App\Models\RoleModel;
use App\Models\SeatModel;
use App\Models\TripModel;
use App\Models\UserModel;
/**
 * BookingService
 * Orchestrates the booking workflow: seat availability, reservation,
 * payment handling and ticket generation. Uses DB transactions to
 * prevent double-booking.
 */
class BookingService
{
    protected BookingModel     $bookings;
    protected BookingSeatModel $bookingSeats;
    protected SeatModel        $seats;
    protected TripModel        $trips;
    protected PaymentService   $payments;
    protected QRCodeService    $qr;
    protected CustomerModel    $customers;
    protected UserModel        $users;
    protected WalletService    $wallet;
    protected LoyaltyService   $loyalty;

    public function __construct()
    {
        $this->bookings     = model(BookingModel::class);
        $this->bookingSeats = model(BookingSeatModel::class);
        $this->seats        = model(SeatModel::class);
        $this->trips        = model(TripModel::class);
        $this->payments     = new PaymentService();
        $this->qr           = new QRCodeService();
        $this->customers    = model(CustomerModel::class);
        $this->users        = model(UserModel::class);
        $this->wallet       = new WalletService();
        $this->loyalty      = new LoyaltyService();
    }

    /**
     * Get the seat map for a trip with availability status.
     */
    public function seatMap(int $tripId): array
    {
        $trip = $this->trips->detailed($tripId);
        if (! $trip) {
            throw new \RuntimeException('Trip not found.');
        }

        $reserved = $this->bookingSeats->reservedSeatsForTrip($tripId);

        $seats = array_map(function ($seat) use ($reserved) {
            $seat['reserved'] = in_array((int) $seat['id'], $reserved, true);
            return $seat;
        }, $this->seats->findByBusId((int) $trip['bus_id']));

        return [
            'trip'    => $trip,
            'seats'   => $seats,
            'layout'  => json_decode($trip['seat_layout'] ?? '[]', true),
        ];
    }

    /**
     * Reserve seats and create a booking + payment record.
     *
     * @throws \RuntimeException when validation fails
     */
    public function create(array $customer, int $tripId, array $seatIds, array $passengers, string $paymentMethod, string $callbackUrl = ''): array
    {
        $trip = $this->trips->find($tripId);
        if (! $trip) {
            throw new \RuntimeException('Trip not found.');
        }
        if ($trip['status'] !== 'scheduled') {
            throw new \RuntimeException('This trip is no longer available.');
        }

        $maxSeats = (int) (settings('max_seats_per_booking', 'booking') ?: 10);
        if (count($seatIds) < 1 || count($seatIds) > $maxSeats) {
            throw new \RuntimeException("You may book between 1 and {$maxSeats} seats per booking.");
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            // Re-verify seat availability inside the transaction to avoid races.
            $reserved = $this->bookingSeats->reservedSeatsForTrip($tripId);

            $tripSeats = $this->seats->findByBusId((int) $trip['bus_id']);
            $seatById  = [];
            foreach ($tripSeats as $s) {
                $seatById[$s['id']] = $s;
            }

            $validSeats = [];
            foreach ($seatIds as $seatId) {
                $seatId = (int) $seatId;
                if (! isset($seatById[$seatId])) {
                    throw new \RuntimeException('Seat does not belong to this trip.');
                }
                if (in_array($seatId, $reserved, true)) {
                    throw new \RuntimeException("Seat {$seatById[$seatId]['seat_number']} was just reserved by another customer.");
                }
                $validSeats[] = $seatById[$seatId];
            }

            $total = 0;
            foreach ($validSeats as $i => $seat) {
                $name  = $passengers[$i]['name'] ?? $passengers[0]['name'] ?? $customer['name'];
                // Price is always derived from the trip server-side; a value
                // supplied by the client is never trusted.
                $price = (float) $trip['price'];
                $total += $price;
            }

            // Early-bird discount applies when the booking is created far
            // enough ahead of the departure date (admin-configurable).
            $discountType   = null;
            $discountAmount = 0.0;
            $earlyBird = $this->loyalty->earlyBirdFor((string) $trip['departure_date']);
            if ($earlyBird) {
                $discountType   = 'early_bird';
                $discountAmount = round($total * $earlyBird['discount_percent'] / 100, 2);
                $total          = round($total - $discountAmount, 2);
            }

            $bookingNumber = $this->generateBookingNumber();

            $bookingId = $this->bookings->insert([
                'booking_number' => $bookingNumber,
                'customer_id'    => (int) $customer['id'],
                'trip_id'        => $tripId,
                'booking_date'   => date('Y-m-d H:i:s'),
                'total_amount'   => $total,
                'seat_count'     => count($validSeats),
                'status'         => 'pending',
                'payment_status' => 'unpaid',
                'discount_type'  => $discountType,
                'discount_amount'=> $discountAmount,
            ]);

            $seatRows = [];
            foreach ($validSeats as $i => $seat) {
                $seatRows[] = [
                    'booking_id'      => $bookingId,
                    'trip_id'         => $tripId,
                    'seat_id'         => $seat['id'],
                    'passenger_name'  => $passengers[$i]['name'] ?? $passengers[0]['name'] ?? $customer['name'],
                    'passenger_age'   => $passengers[$i]['age'] ?? null,
                    'passenger_gender'=> $passengers[$i]['gender'] ?? null,
                    'ticket_price'    => $trip['price'],
                ];
            }
            $inserted = $this->bookingSeats->insertBatch($seatRows);
            if ($inserted === false || (int) $inserted !== count($seatRows)) {
                // CI4 silently returns a non-throwing failure for queries that
                // fail inside a transaction (e.g. the trip_id+seat_id unique
                // index). Refuse to commit a booking without its seats.
                throw new \RuntimeException('One of the selected seats was just taken. Please choose again.');
            }

            // Recompute available seats from actual reservations (robust vs races).
            $this->trips->update($tripId, [
                'available_seats' => max(0, count($tripSeats) - (count($reserved) + count($validSeats))),
            ]);

            $paymentRef = 'PAY-' . strtoupper(bin2hex(random_bytes(6)));

            if ($paymentMethod === 'wallet') {
                // Debit the wallet inside the same transaction so a failed
                // booking rolls the charge back.
                $this->wallet->charge(
                    (int) $customer['id'],
                    $total,
                    $paymentRef,
                    'Booking ' . $bookingNumber
                );
            }

            $paymentId = $this->payments->record([
                'booking_id'        => $bookingId,
                'payment_reference' => $paymentRef,
                'amount'            => $total,
                'payment_method'    => $paymentMethod === 'paystack' ? 'paystack' : ($paymentMethod === 'wallet' ? 'wallet' : 'cash'),
                'status'            => $paymentMethod === 'paystack' ? 'pending' : 'success',
                'paid_at'           => $paymentMethod === 'paystack' ? null : date('Y-m-d H:i:s'),
            ]);

            if ($paymentMethod === 'cash' || $paymentMethod === 'wallet') {
                // Cash/wallet placeholder: mark paid & confirmed immediately.
                $this->payments->markPaid($paymentId);
                $this->loyalty->awardForPaidBooking($bookingId);
            }

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        $booking = $this->bookings->find($bookingId);

        // Transactional emails (best-effort; a mail failure never blocks the booking).
        if (($booking['status'] ?? '') === 'confirmed') {
            $this->sendBookingConfirmed((int) $bookingId);
        } else {
            $this->sendBookingCreated((int) $bookingId);
        }

        // For Paystack, initialize the transaction and store the reference.
        // If initialization fails (e.g. no keys / offline), the booking is kept
        // as pending so the customer can retry.
        $paystackAuthUrl = null;
        $paystackError = null;
        if ($paymentMethod === 'paystack') {
            try {
                $customerUser = model(\App\Models\UserModel::class)->find($customer['user_id']);
                $init = $this->payments->initializePaystack([
                    'email'          => $customerUser['email'] ?? $customer['email'],
                    'amount'         => $total,
                    'reference'      => $paymentRef,
                    'booking_number' => $bookingNumber,
                ], $callbackUrl);

                $paystackAuthUrl = $init['authorization_url'] ?? null;
                $this->payments->update($paymentId, ['paystack_ref' => $init['reference'] ?? $paymentRef]);
            } catch (\Throwable $e) {
                $paystackError = $e->getMessage();
            }
        }

        return [
            'booking'          => $booking,
            'payment_ref'      => $paymentRef,
            'authorization_url'=> $paystackAuthUrl,
            'paystack_error'   => $paystackError,
        ];
    }

    /**
     * Reassign the seats of an existing booking (vendor walk-in/oversight).
     * Replaces the booking's seat rows, preserving passenger details by index,
     * then recomputes the trip's available seat count.
     *
     * @throws \RuntimeException when the booking cannot be changed
     */
    public function changeSeats(int $bookingId, array $seatIds, array $passengers = []): array
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }
        if (! in_array($booking['status'], ['pending', 'confirmed'], true)) {
            throw new \RuntimeException('Seats can only be changed for pending or confirmed bookings.');
        }

        $tripId = (int) $booking['trip_id'];
        $trip   = $this->trips->find($tripId);
        if (! $trip) {
            throw new \RuntimeException('Trip not found.');
        }

        $seatIds = array_values(array_unique(array_map('intval', $seatIds)));
        if (empty($seatIds)) {
            throw new \RuntimeException('Select at least one seat.');
        }

        $maxSeats = (int) (settings('max_seats_per_booking', 'booking') ?: 10);
        if (count($seatIds) > $maxSeats) {
            throw new \RuntimeException("A booking may hold up to {$maxSeats} seats.");
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $tripSeats = $this->seats->findByBusId((int) $trip['bus_id']);
            $seatById  = [];
            foreach ($tripSeats as $s) {
                $seatById[$s['id']] = $s;
            }

            $existing = $this->bookingSeats->where('booking_id', $bookingId)->orderBy('id', 'ASC')->findAll();
            $mySeatIds = array_map('intval', array_column($existing, 'seat_id'));

            $reservedAll    = $this->bookingSeats->reservedSeatsForTrip($tripId);
            $reservedOthers = array_values(array_diff($reservedAll, $mySeatIds));

            $valid = [];
            foreach ($seatIds as $seatId) {
                if (! isset($seatById[$seatId])) {
                    throw new \RuntimeException('Selected seat does not belong to this trip.');
                }
                if (in_array($seatId, $reservedOthers, true)) {
                    throw new \RuntimeException("Seat {$seatById[$seatId]['seat_number']} is already reserved by another booking.");
                }
                $valid[] = $seatById[$seatId];
            }

            $customer     = model(\App\Models\CustomerModel::class)->find($booking['customer_id']);
            $defaultName  = $customer['name'] ?? 'Passenger';

            $rows  = [];
            $total = 0;
            foreach ($valid as $i => $seat) {
                $name  = $passengers[$i]['name']  ?? $existing[$i]['passenger_name']  ?? $existing[0]['passenger_name'] ?? $defaultName;
                $price = (float) $trip['price'];
                $total += (float) $price;
                $rows[] = [
                    'booking_id'      => $bookingId,
                    'trip_id'         => $tripId,
                    'seat_id'         => $seat['id'],
                    'passenger_name'  => $name,
                    'passenger_age'   => $passengers[$i]['age']    ?? $existing[$i]['passenger_age']   ?? null,
                    'passenger_gender'=> $passengers[$i]['gender'] ?? $existing[$i]['passenger_gender'] ?? null,
                    'ticket_price'    => (float) $price,
                ];
            }

            $this->bookingSeats->where('booking_id', $bookingId)->delete();
            $inserted = $this->bookingSeats->insertBatch($rows);
            if ($inserted === false || (int) $inserted !== count($rows)) {
                throw new \RuntimeException('One of the selected seats was just taken. Please choose again.');
            }

            // Preserve the early-bird discount across seat changes.
            $discountAmount = 0.0;
            if ($booking['discount_type'] === 'early_bird') {
                $discountAmount = round($total * (int) (settings('early_bird_percent', 'early_bird') ?: 15) / 100, 2);
                $total          = round($total - $discountAmount, 2);
            }

            $this->bookings->update($bookingId, [
                'seat_count'      => count($rows),
                'total_amount'    => $total,
                'discount_amount' => $discountAmount,
            ]);

            $this->trips->update($tripId, [
                'available_seats' => max(0, count($tripSeats) - count($this->bookingSeats->reservedSeatsForTrip($tripId))),
            ]);

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return $this->ticket($bookingId);
    }

    /**
     * Confirm a pending booking (vendor action for walk-ins/oversight).
     *
     * @throws \RuntimeException when the booking cannot be confirmed
     */
    public function confirm(int $bookingId): array
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }
        if ($booking['status'] === 'confirmed') {
            return $this->ticket($bookingId);
        }
        if ($booking['status'] !== 'pending') {
            throw new \RuntimeException('Only pending bookings can be confirmed.');
        }

        $this->bookings->update($bookingId, ['status' => 'confirmed']);
        return $this->ticket($bookingId);
    }

    /**
     * Cancel a pending/confirmed booking: free its seats, refund a paid booking
     * back to the customer's wallet (idempotent), and recompute availability.
     *
     * @throws \RuntimeException when the booking cannot be cancelled
     */
    public function cancel(int $bookingId): array
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }
        if (! in_array($booking['status'], ['pending', 'confirmed'], true)) {
            throw new \RuntimeException('This booking cannot be cancelled.');
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->bookings->update($bookingId, ['status' => 'cancelled']);

            // Free the seats: leftover booking_seats rows would keep the
            // (trip_id, seat_id) unique index occupied and block re-booking.
            $this->bookingSeats->where('booking_id', $bookingId)->delete();

            // Refund paid bookings (wallet or card) back to the wallet (once,
            // idempotent: the paid->refunded transition only happens the first
            // time). Card payments are refunded to the customer's wallet too.
            if ($booking['payment_status'] === 'paid') {
                $paidPayment = $this->firstRefundablePayment($bookingId);
                if ($paidPayment) {
                    $this->wallet->refund(
                        (int) $booking['customer_id'],
                        (float) $paidPayment['amount'],
                        'REF-' . strtoupper(bin2hex(random_bytes(6))),
                        'Refund for cancelled booking ' . $booking['booking_number']
                    );
                    $this->bookings->update($bookingId, ['payment_status' => 'refunded']);
                }
            }

            $this->recomputeAvailability((int) $booking['trip_id']);

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw new \RuntimeException('Could not cancel the booking. Please try again.');
        }

        $this->sendBookingCancelled($bookingId);

        return $this->ticket($bookingId);
    }

    /**
     * Refund a paid booking back to the customer's wallet without cancelling
     * the booking (partial refunds are not supported). Idempotent.
     *
     * @throws \RuntimeException when there is nothing to refund
     */
    public function refund(int $bookingId): array
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }
        if ($booking['payment_status'] !== 'paid') {
            throw new \RuntimeException('Only paid bookings can be refunded.');
        }

        $paidPayment = $this->firstRefundablePayment($bookingId);
        if (! $paidPayment) {
            throw new \RuntimeException('No refundable payment was found for this booking.');
        }

        $this->wallet->refund(
            (int) $booking['customer_id'],
            (float) $paidPayment['amount'],
            'REF-' . strtoupper(bin2hex(random_bytes(6))),
            'Refund for booking ' . $booking['booking_number']
        );
        $this->bookings->update($bookingId, ['payment_status' => 'refunded']);

        return $this->ticket($bookingId);
    }

    /**
     * Move a booking to a different trip: free the old seats, reserve the new
     * ones (preserving passenger details by index), and recompute availability
     * on both trips.
     *
     * @throws \RuntimeException when the reschedule cannot be performed
     */
    public function reschedule(int $bookingId, int $newTripId, array $seatIds = [], array $passengers = []): array
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }
        if (! in_array($booking['status'], ['pending', 'confirmed'], true)) {
            throw new \RuntimeException('Only pending or confirmed bookings can be rescheduled.');
        }

        $newTrip = $this->trips->find($newTripId);
        if (! $newTrip || $newTrip['status'] !== 'scheduled') {
            throw new \RuntimeException('The new trip is not available for rescheduling.');
        }

        $seatIds = array_values(array_unique(array_map('intval', $seatIds)));
        if (empty($seatIds)) {
            throw new \RuntimeException('Select at least one seat on the new trip.');
        }

        $maxSeats = (int) (settings('max_seats_per_booking', 'booking') ?: 10);
        if (count($seatIds) > $maxSeats) {
            throw new \RuntimeException("A booking may hold up to {$maxSeats} seats.");
        }

        $oldTripId = (int) $booking['trip_id'];
        $oldSeats  = $this->bookingSeats->where('booking_id', $bookingId)->orderBy('id', 'ASC')->findAll();

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            // Free the old seats first so they can be rebooked immediately.
            $this->bookingSeats->where('booking_id', $bookingId)->delete();
            $this->recomputeAvailability($oldTripId);

            // Validate and reserve the new seats inside the transaction.
            $tripSeats = $this->seats->findByBusId((int) $newTrip['bus_id']);
            $seatById  = [];
            foreach ($tripSeats as $s) {
                $seatById[$s['id']] = $s;
            }

            $reserved  = $this->bookingSeats->reservedSeatsForTrip($newTripId);
            $valid     = [];
            foreach ($seatIds as $seatId) {
                if (! isset($seatById[$seatId])) {
                    throw new \RuntimeException('Selected seat does not belong to the new trip.');
                }
                if (in_array($seatId, $reserved, true)) {
                    throw new \RuntimeException("Seat {$seatById[$seatId]['seat_number']} is already taken on the new trip.");
                }
                $valid[] = $seatById[$seatId];
            }

            $customer    = model(\App\Models\CustomerModel::class)->find($booking['customer_id']);
            $defaultName = $customer['name'] ?? 'Passenger';

            $rows  = [];
            $total = 0;
            foreach ($valid as $i => $seat) {
                $name  = $passengers[$i]['name']  ?? $oldSeats[$i]['passenger_name']  ?? $oldSeats[0]['passenger_name'] ?? $defaultName;
                $price = (float) $newTrip['price'];
                $total += (float) $price;
                $rows[] = [
                    'booking_id'      => $bookingId,
                    'trip_id'         => $newTripId,
                    'seat_id'         => $seat['id'],
                    'passenger_name'  => $name,
                    'passenger_age'   => $passengers[$i]['age']    ?? $oldSeats[$i]['passenger_age']   ?? null,
                    'passenger_gender'=> $passengers[$i]['gender'] ?? $oldSeats[$i]['passenger_gender'] ?? null,
                    'ticket_price'    => (float) $price,
                ];
            }

            $inserted = $this->bookingSeats->insertBatch($rows);
            if ($inserted === false || (int) $inserted !== count($rows)) {
                throw new \RuntimeException('One of the selected seats was just taken. Please choose again.');
            }

            // Preserve the early-bird discount across the reschedule.
            $discountAmount = 0.0;
            if ($booking['discount_type'] === 'early_bird') {
                $discountAmount = round($total * (int) (settings('early_bird_percent', 'early_bird') ?: 15) / 100, 2);
                $total          = round($total - $discountAmount, 2);
            }

            $this->bookings->update($bookingId, [
                'trip_id'         => $newTripId,
                'seat_count'      => count($rows),
                'total_amount'    => $total,
                'discount_amount' => $discountAmount,
            ]);

            $this->recomputeAvailability($newTripId);

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return $this->ticket($bookingId);
    }

    /**
     * First successful wallet/card payment on a booking (the refundable one).
     */
    protected function firstRefundablePayment(int $bookingId): ?array
    {
        foreach (model(\App\Models\PaymentModel::class)->findByBookingId($bookingId) as $p) {
            if ($p['status'] === 'success' && in_array($p['payment_method'], ['wallet', 'paystack'], true)) {
                return $p;
            }
        }
        return null;
    }

    /**
     * Recompute a trip's available seats from actual reservations.
     */
    public function recomputeAvailability(int $tripId): void
    {
        $trip = $this->trips->find($tripId);
        if (! $trip) {
            return;
        }
        $tripSeats = $this->seats->findByBusId((int) $trip['bus_id']);
        $reserved  = $this->bookingSeats->reservedSeatsForTrip($tripId);
        $this->trips->update($tripId, [
            'available_seats' => max(0, count($tripSeats) - count($reserved)),
        ]);
    }

    /**
     * Create a walk-in booking on behalf of a vendor (cash sale).
     * Resolves or creates the customer account, then reserves the seats.
     *
     * @throws \RuntimeException when validation fails
     */
    public function vendorBooking(int $tripId, array $seatIds, array $passengers, array $customerData = []): array
    {
        $customer = $this->resolveCustomer($customerData);
        return $this->create($customer, $tripId, $seatIds, $passengers, 'cash');
    }

    /**
     * Resolve an existing customer by email or create a new customer account.
     * Without an email a synthetic walk-in account is created.
     */
    public function resolveCustomer(array $data): array
    {
        $name  = trim((string) ($data['name'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $phone = trim((string) ($data['phone'] ?? ''));

        if ($email !== '') {
            $user = $this->users->where('email', $email)->first();
            if ($user) {
                $customer = $this->customers->where('user_id', (int) $user['id'])->first();
                if (! $customer) {
                    $customer = $this->customers->find($this->customers->insert(['user_id' => (int) $user['id']]));
                }
                return $this->hydrateCustomer($customer, $user);
            }
            return $this->createCustomerUser($name, $email, $phone);
        }

        return $this->createCustomerUser($name, 'walkin-' . bin2hex(random_bytes(4)) . '@walkin.local', $phone);
    }

    /**
     * Create a user + customer profile in one step.
     */
    protected function createCustomerUser(string $name, string $email, string $phone): array
    {
        $role = model(RoleModel::class)->findBySlug('customer');

        $userId = $this->users->insert([
            'name'      => $name ?: 'Walk-in Customer',
            'email'     => $email,
            'phone'     => $phone ?: null,
            'password'  => bin2hex(random_bytes(6)),
            'role_id'   => $role['id'],
            'is_active' => 1,
        ]);

        $customerId = $this->customers->insert(['user_id' => (int) $userId]);
        return $this->hydrateCustomer($this->customers->find($customerId), $this->users->find($userId));
    }

    /**
     * Attach the display name / email / phone to a customer profile row.
     */
    protected function hydrateCustomer(array $customer, array $user): array
    {
        $customer['name']  = $user['name'] ?? $customer['name'] ?? 'Walk-in Customer';
        $customer['email'] = $user['email'] ?? null;
        $customer['phone'] = $user['phone'] ?? null;
        return $customer;
    }

    /**
     * Verify a Paystack payment reference and confirm the booking.
     */
    public function verifyPayment(string $reference, int $customerId): array
    {
        $payment = $this->payments->findByReference($reference);
        if (! $payment) {
            throw new \RuntimeException('Payment reference not found.');
        }

        $booking = $this->bookings->find($payment['booking_id']);
        if (! $booking || (int) $booking['customer_id'] !== $customerId) {
            throw new \RuntimeException('Booking not found for this customer.');
        }

        // Idempotent: once paid, repeat verify calls (page reloads, retries,
        // multiple clients) must not re-mark, re-award loyalty, or re-send the
        // receipt email.
        if ($payment['status'] === 'success') {
            return $this->ticket((int) $booking['id']);
        }

        $verified = $this->payments->verifyPaystack($reference);
        if (($verified['status'] ?? '') === 'success') {
            if (! $this->payments->amountMatches((float) $payment['amount'], $verified)) {
                throw new \RuntimeException('Payment amount does not match this booking. Please contact support.');
            }
            $this->payments->markPaid($payment['id'], [
                'transaction_id' => $verified['reference'] ?? null,
                'paystack_ref'   => $verified['reference'] ?? null,
            ]);
            $this->loyalty->awardForPaidBooking((int) $booking['id']);
            $this->sendBookingConfirmed((int) $booking['id']);
        } else {
            $this->payments->update($payment['id'], ['status' => 'failed']);
            throw new \RuntimeException('Payment was not successful.');
        }

        return $this->ticket((int) $booking['id']);
    }

    /**
     * Safe status check for a booking payment while the checkout is open.
     * Reconciles to success only (marks the payment paid and the booking
     * confirmed); never marks a payment failed, so it can be polled safely.
     *
     * @throws \RuntimeException when the reference is unknown or not owned
     */
    public function paymentStatus(string $reference, int $customerId): array
    {
        $payment = $this->payments->findByReference($reference);
        if (! $payment) {
            throw new \RuntimeException('Payment reference not found.');
        }

        $booking = $this->bookings->find($payment['booking_id']);
        if (! $booking || (int) $booking['customer_id'] !== $customerId) {
            throw new \RuntimeException('Booking not found for this customer.');
        }

        if ($payment['status'] === 'success') {
            return ['status' => 'success', 'booking_id' => (int) $booking['id']];
        }

        try {
            $verified = $this->payments->verifyPaystack($reference);
        } catch (\Throwable $e) {
            return ['status' => 'pending', 'booking_id' => (int) $booking['id']];
        }

        if (($verified['status'] ?? '') === 'success' && $this->payments->amountMatches((float) $payment['amount'], $verified)) {
            $this->payments->markPaid($payment['id'], [
                'transaction_id' => $verified['reference'] ?? null,
                'paystack_ref'   => $verified['reference'] ?? null,
            ]);
            $this->loyalty->awardForPaidBooking((int) $booking['id']);
            $this->sendBookingConfirmed((int) $booking['id']);
            return ['status' => 'success', 'booking_id' => (int) $booking['id']];
        }

        return ['status' => 'pending', 'booking_id' => (int) $booking['id']];
    }

    /**
     * Server-side reconciliation from a verified Paystack webhook event. Used
     * when a customer pays but never returns to trip the verify endpoint, so
     * the booking still gets confirmed. Idempotent, and amount-guarded exactly
     * like verifyPayment().
     *
     * @throws \RuntimeException when the reference matches no booking payment
     */
    public function reconcileFromWebhook(string $reference, array $webhook): void
    {
        $payment = $this->payments->findByReference($reference);
        if (! $payment) {
            throw new \RuntimeException('Payment reference not found.');
        }

        if ($payment['status'] === 'success' || ($webhook['status'] ?? '') !== 'success') {
            return;
        }

        if (! $this->payments->amountMatches((float) $payment['amount'], $webhook)) {
            log_message('error', 'Paystack webhook amount mismatch for reference {ref}', ['ref' => $reference]);
            return;
        }

        $this->payments->markPaid($payment['id'], [
            'transaction_id' => $webhook['reference'] ?? $reference,
            'paystack_ref'   => $webhook['reference'] ?? $reference,
        ]);
        $this->loyalty->awardForPaidBooking((int) $payment['booking_id']);
        $this->sendBookingConfirmed((int) $payment['booking_id']);
    }

    /**
     * Generate and persist the QR token for a booking.
     */
    public function attachQR(int $bookingId): string
    {
        $booking = $this->bookings->find($bookingId);
        $token = $this->qr->makeTicketToken((int) $booking['id'], $booking['booking_number']);
        $qrDataUri = $this->qr->toDataUri($token);
        $this->bookings->update($bookingId, ['qr_code' => $token]);

        return $qrDataUri;
    }

    /**
     * Build the full printable ticket payload.
     */
    public function ticket(int $bookingId, bool $withQR = true): array
    {
        $booking = $this->bookings->detailed($bookingId);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }

        $seats = $this->bookingSeats->findByBookingId($bookingId);
        $payments = $this->payments->findByBookingId($bookingId);

        return [
            'booking'  => $booking,
            'seats'    => $seats,
            'payments' => $payments,
            'qr'       => $withQR && ! empty($booking['qr_code'])
                ? $this->qr->toDataUri($booking['qr_code'])
                : ($withQR ? $this->attachQR($bookingId) : null),
        ];
    }

    /**
     * Validate a scanned QR token (used by vendors at check-in).
     */
    public function validateTicket(string $token): array
    {
        if (strpos($token, 'ticket:') !== 0) {
            throw new \RuntimeException('Invalid ticket code.');
        }

        $parts = explode(':', $token);
        $bookingNumber = $parts[1] ?? '';
        $bookingId     = (int) ($parts[2] ?? 0);
        $hash          = $parts[3] ?? '';

        $booking = $this->bookings->find($bookingId);
        if (! $booking || $booking['booking_number'] !== $bookingNumber) {
            throw new \RuntimeException('Invalid ticket.');
        }

        $expected = $this->qr->makeTicketToken($bookingId, $bookingNumber);
        $expectedHash = explode(':', $expected)[3] ?? '';

        if ($hash !== $expectedHash) {
            throw new \RuntimeException('Ticket verification failed.');
        }

        if ($booking['status'] === 'cancelled') {
            throw new \RuntimeException('This booking has been cancelled.');
        }
        if ($booking['payment_status'] !== 'paid') {
            throw new \RuntimeException('Payment for this booking is not complete.');
        }

        return $this->ticket($bookingId, false);
    }

    /**
     * Generate a unique, human-friendly booking number.
     */
    protected function generateBookingNumber(): string
    {
        $prefix = settings('booking_prefix', 'general') ?: 'BL';
        do {
            $number = strtoupper($prefix . date('ymd') . strtoupper(bin2hex(random_bytes(3))));
        } while ($this->bookings->findByBookingNumber($number));

        return $number;
    }

    /**
     * Best-effort email: booking created (payment pending).
     */
    protected function sendBookingCreated(int $bookingId): void
    {
        try {
            $user = $this->bookingUser($bookingId);
            if ($user) {
                ($booking = $this->bookings->detailed($bookingId));
                (new EmailService())->bookingCreated(
                    $user,
                    $booking,
                    $this->bookingSeats->findByBookingId($bookingId)
                );
                $this->notifyBookingUser(
                    $bookingId,
                    'booking_created',
                    'Booking received',
                    'Your booking ' . ($booking['booking_number'] ?? '') . ' is pending payment. Complete checkout to confirm.'
                );
            }
        } catch (\Throwable $e) {
            // ignore mail failures
        }
    }

    /**
     * Best-effort email: booking paid and confirmed.
     */
    protected function sendBookingConfirmed(int $bookingId): void
    {
        try {
            $user = $this->bookingUser($bookingId);
            if ($user) {
                $booking = $this->bookings->detailed($bookingId);
                (new EmailService())->bookingConfirmed(
                    $user,
                    $booking,
                    $this->bookingSeats->findByBookingId($bookingId)
                );
                $this->notifyBookingUser(
                    $bookingId,
                    'booking_confirmed',
                    'Booking confirmed',
                    'Your booking ' . ($booking['booking_number'] ?? '') . ' is confirmed. Your ticket is ready.'
                );
            }
        } catch (\Throwable $e) {
            // ignore mail failures
        }
    }

    /**
     * Best-effort email: booking cancelled.
     */
    protected function sendBookingCancelled(int $bookingId): void
    {
        try {
            $user = $this->bookingUser($bookingId);
            if ($user) {
                $booking = $this->bookings->detailed($bookingId);
                (new EmailService())->bookingCancelled(
                    $user,
                    $booking
                );
                $this->notifyBookingUser(
                    $bookingId,
                    'booking_cancelled',
                    'Booking cancelled',
                    'Your booking ' . ($booking['booking_number'] ?? '') . ' has been cancelled.'
                );
            }
        } catch (\Throwable $e) {
            // ignore mail failures
        }
    }

    /**
     * Resolve the account owner of a booking.
     */
    protected function bookingUser(int $bookingId): ?array
    {
        $booking  = $this->bookings->find($bookingId);
        $customer = $booking ? $this->customers->find((int) $booking['customer_id']) : null;
        return $customer ? $this->users->find((int) $customer['user_id']) : null;
    }

    /**
     * Send an in-app + push notification to the booking's owner.
     * Best-effort: failures never affect the booking flow.
     */
    protected function notifyBookingUser(int $bookingId, string $type, string $title, ?string $message = null, ?array $data = null): void
    {
        try {
            $user = $this->bookingUser($bookingId);
            if ($user && ! empty($user['id'])) {
                (new NotificationService())->notify((int) $user['id'], $type, $title, $message, $data);
            }
        } catch (\Throwable $e) {
            // ignore notification failures
        }
    }
}

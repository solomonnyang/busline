<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * BookingSeatModel - manages the booking_seats table.
 */
class BookingSeatModel extends Model
{
    protected $table         = 'booking_seats';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'booking_id', 'trip_id', 'seat_id', 'passenger_name',
        'passenger_age', 'passenger_gender', 'ticket_price',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByBookingId(int $bookingId)
    {
        return $this->select(
            'booking_seats.*, seats.seat_number, seats.seat_row, seats.seat_column, seats.seat_type'
        )
            ->join('seats', 'seats.id = booking_seats.seat_id', 'left')
            ->where('booking_seats.booking_id', $bookingId)
            ->findAll();
    }

    /**
     * Seat ids already reserved on a trip (confirmed or pending bookings).
     *
     * @return list<int>
     */
    public function reservedSeatsForTrip(int $tripId): array
    {
        // Authoritative reservation check: any physical booking_seats row
        // occupies the (trip_id, seat_id) unique index, so the seat is blocked
        // regardless of the owning booking's status (pending, confirmed or
        // completed). Relying on a status filter caused completed bookings'
        // seats to still be offered as available, then fail on the unique key.
        // Cancelled bookings delete their seat rows, so they never appear here;
        // we still exclude the status defensively for legacy rows.
        return array_map(
            fn ($row) => (int) $row['seat_id'],
            $this->select('booking_seats.seat_id')
                ->join('bookings', 'bookings.id = booking_seats.booking_id', 'left')
                ->where('booking_seats.trip_id', $tripId)
                ->where('bookings.status !=', 'cancelled')
                ->findAll()
        );
    }
}

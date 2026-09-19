<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * TripRecurrenceModel - manages the trip_recurrences table.
 */
class TripRecurrenceModel extends Model
{
    protected $table         = 'trip_recurrences';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['trip_id', 'frequency', 'days_of_week', 'repeat_until'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByTripId(int $tripId)
    {
        return $this->where('trip_id', $tripId)->first();
    }

    public function findDetailedByTripId(int $tripId)
    {
        $row = $this->where('trip_id', $tripId)->first();
        if ($row) {
            $row['days_of_week'] = json_decode($row['days_of_week'] ?? 'null', true);
        }
        return $row;
    }

    /**
     * Save a trip's recurrence (one per trip) with JSON encoding.
     */
    public function saveForTrip(int $tripId, array $data): void
    {
        $this->where('trip_id', $tripId)->delete();

        $payload = [
            'trip_id'      => $tripId,
            'frequency'    => in_array($data['frequency'] ?? '', ['daily', 'weekly', 'custom'], true) ? $data['frequency'] : 'weekly',
            'days_of_week' => ! empty($data['days_of_week']) ? json_encode($data['days_of_week']) : null,
            'repeat_until' => $data['repeat_until'] ?? null,
        ];

        $this->insert($payload);
    }
}

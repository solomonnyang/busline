<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * TripDriverModel - manages the trip_drivers pivot table.
 */
class TripDriverModel extends Model
{
    protected $table         = 'trip_drivers';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['trip_id', 'driver_id', 'role'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByTripId(int $tripId)
    {
        return $this->select('trip_drivers.*, drivers.name, drivers.phone, drivers.email, drivers.license_number, drivers.avatar, drivers.status')
            ->join('drivers', 'drivers.id = trip_drivers.driver_id', 'left')
            ->where('trip_drivers.trip_id', $tripId)
            ->orderBy('trip_drivers.role', 'ASC')
            ->findAll();
    }

    /**
     * Replace a trip's driver assignments with the given driver_id => role pairs.
     */
    public function sync(int $tripId, array $assignments): void
    {
        $this->where('trip_id', $tripId)->delete();

        $now = date('Y-m-d H:i:s');
        $rows = [];
        foreach ($assignments as $driverId => $role) {
            if ((int) $driverId <= 0) {
                continue;
            }
            $rows[] = [
                'trip_id'    => (int) $tripId,
                'driver_id'  => (int) $driverId,
                'role'       => $role === 'assistant' ? 'assistant' : 'driver',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rows) {
            $this->insertBatch($rows);
        }
    }
}

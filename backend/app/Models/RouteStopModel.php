<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * RouteStopModel - manages the route_stops table.
 */
class RouteStopModel extends Model
{
    protected $table         = 'route_stops';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['route_id', 'city_id', 'name', 'stop_order', 'arrival_offset', 'departure_offset'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByRouteId(int $routeId)
    {
        return $this->select('route_stops.*, cities.name as city_name')
            ->join('cities', 'cities.id = route_stops.city_id', 'left')
            ->where('route_stops.route_id', $routeId)
            ->orderBy('route_stops.stop_order', 'ASC')
            ->findAll();
    }

    /**
     * Replace a route's stop list.
     */
    public function sync(int $routeId, array $stops): void
    {
        $this->where('route_id', $routeId)->delete();

        $now = date('Y-m-d H:i:s');
        $rows = [];
        foreach ($stops as $i => $stop) {
            $rows[] = [
                'route_id'         => (int) $routeId,
                'city_id'          => isset($stop['city_id']) && (int) $stop['city_id'] > 0 ? (int) $stop['city_id'] : null,
                'name'             => trim((string) ($stop['name'] ?? '')),
                'stop_order'       => (int) ($stop['stop_order'] ?? ($i + 1)),
                'arrival_offset'   => isset($stop['arrival_offset']) && $stop['arrival_offset'] !== '' ? (int) $stop['arrival_offset'] : null,
                'departure_offset' => isset($stop['departure_offset']) && $stop['departure_offset'] !== '' ? (int) $stop['departure_offset'] : null,
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
        }

        $rows = array_filter($rows, fn ($r) => $r['name'] !== '');
        if ($rows) {
            $this->insertBatch(array_values($rows));
        }
    }
}

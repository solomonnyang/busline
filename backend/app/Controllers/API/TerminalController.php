<?php

namespace App\Controllers\API;

use App\Models\CityModel;
use App\Models\TerminalModel;
use App\Models\TripModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * TerminalController
 * Public endpoints for bus terminals, powering the interactive dashboard map.
 */
class TerminalController extends BaseApiController
{
    protected TerminalModel $terminals;
    protected TripModel $trips;

    public function __construct()
    {
        $this->terminals = model(TerminalModel::class);
        $this->trips     = model(TripModel::class);
    }

    /**
     * GET /api/terminals
     * List terminals, optionally filtered by city, keyword, operator, price
     * or nearest to a supplied lat/lng.
     */
    public function index(): ResponseInterface
    {
        $cityId   = $this->request->getGet('city_id');
        $q        = trim((string) $this->request->getGet('q'));
        $operator = trim((string) $this->request->getGet('operator'));
        $maxPrice = $this->request->getGet('max_price');
        $lat      = $this->request->getGet('lat');
        $lng      = $this->request->getGet('lng');
        $destCity = $this->request->getGet('destination');

        if ($cityId) {
            $terminals = $this->terminals->withCity()->where('terminals.city_id', (int) $cityId)->findAll();
        } elseif ($q !== '') {
            $terminals = $this->terminals->search($q);
        } else {
            $terminals = $this->terminals->withCity()->where('terminals.is_active', 1)->findAll();
        }

        $terminals = $this->enrich($terminals, $lat, $lng, is_numeric($destCity) ? (int) $destCity : null);

        // Apply optional filters.
        if ($operator !== '') {
            $terminals = array_values(array_filter($terminals, function ($t) use ($operator) {
                return in_array($operator, $t['operators'], true);
            }));
        }
        if (is_numeric($maxPrice)) {
            $max = (float) $maxPrice;
            $terminals = array_values(array_filter($terminals, function ($t) use ($max) {
                return $t['min_price'] !== null && $t['min_price'] <= $max;
            }));
        }
        if ($lat !== null && $lng !== null) {
            usort($terminals, fn ($a, $b) => $a['distance_km'] <=> $b['distance_km']);
        }

        return api_success($terminals, count($terminals) . ' terminal(s) found.');
    }

    /**
     * GET /api/terminals/{id}
     * Single terminal with live stats and available buses.
     */
    public function show(int $id): ResponseInterface
    {
        $terminal = $this->terminals->withCity()->where('terminals.id', $id)->first();
        if (! $terminal) {
            return api_error('Terminal not found.', 404);
        }

        $lat = $this->request->getGet('lat');
        $lng = $this->request->getGet('lng');
        [$terminal] = $this->enrich([$terminal], $lat, $lng);

        return api_success($terminal);
    }

    /**
     * GET /api/terminals/suggestions?q=
     * Lightweight autocomplete mixing cities and terminals.
     */
    public function suggestions(): ResponseInterface
    {
        $q = trim((string) $this->request->getGet('q'));
        if ($q === '') {
            return api_success([]);
        }

        $cities = model(CityModel::class)
            ->where('is_active', 1)
            ->groupStart()
            ->like('name', $q)
            ->orLike('state', $q)
            ->groupEnd()
            ->orderBy('name', 'ASC')
            ->limit(6)
            ->findAll();

        $terminals = $this->terminals->search($q);
        $terminals = array_slice($terminals, 0, 6);

        $cityResults = array_map(function ($c) {
            return ['type' => 'city', 'id' => (int) $c['id'], 'label' => $c['name'], 'sub' => $c['state'], 'lat' => (float) $c['lat'], 'lng' => (float) $c['lng']];
        }, $cities);

        $terminalResults = array_map(function ($t) {
            return ['type' => 'terminal', 'id' => (int) $t['id'], 'city_id' => (int) $t['city_id'], 'label' => $t['name'], 'sub' => $t['city_name'], 'lat' => (float) $t['lat'], 'lng' => (float) $t['lng']];
        }, $terminals);

        return api_success(array_merge($cityResults, $terminalResults));
    }

    /**
     * Enrich terminals with live stats derived from scheduled trips operated
     * by the vendors registered at each terminal.
     * Optionally restricts to trips attributed to a given destination city.
     */
    private function enrich(array $terminals, $lat = null, $lng = null, ?int $destination = null): array
    {
        if (empty($terminals)) {
            return [];
        }

        $allTrips = $this->trips->search();

        // Only trips attributed to the requested destination city are shown.
        if ($destination !== null) {
            $allTrips = array_values(array_filter(
                $allTrips,
                fn ($t) => (int) ($t['destination_city_id'] ?? 0) === $destination
            ));
        }

        // Build a map of terminal_id -> sorted upcoming trips. A trip departs
        // from its effective terminal: trips.terminal_id when set, otherwise
        // the terminal its bus is assigned to (buses.terminal_id). Legacy
        // trips without either fall back to the vendor's registered terminal
        // in the trip's origin city.
        $terminalIds = array_values(array_unique(array_map('intval', array_column($terminals, 'id'))));

        $vendorTerminals = $this->vendorTerminalMap();
        $terminalCities  = $this->terminalCityMap();

        $tripsByTerminal = [];
        foreach ($allTrips as $t) {
            $busTerminal = (int) ($t['bus_terminal_id'] ?? 0);
            if ($busTerminal && in_array($busTerminal, $terminalIds, true)) {
                $tripsByTerminal[$busTerminal][] = $t;
                continue;
            }
            foreach ($this->resolveTripTerminals($t, $vendorTerminals, $terminalCities) as $tid) {
                if (in_array($tid, $terminalIds, true)) {
                    $tripsByTerminal[$tid][] = $t;
                }
            }
        }
        foreach ($tripsByTerminal as &$list) {
            usort($list, function ($a, $b) {
                $cmp = strcmp($a['departure_date'], $b['departure_date']);
                return $cmp !== 0 ? $cmp : strcmp($a['departure_time'], $b['departure_time']);
            });
        }

        $now = date('Y-m-d');
        $userLat = is_numeric($lat) ? (float) $lat : null;
        $userLng = is_numeric($lng) ? (float) $lng : null;

        foreach ($terminals as &$t) {
            $terminalTrips = $tripsByTerminal[$t['id']] ?? [];
            $upcoming      = array_values(array_filter($terminalTrips, fn ($x) => $x['departure_date'] >= $now));
            $prices        = array_column($terminalTrips, 'price');

            $t['city_name']       = $t['city_name'] ?? null;
            $t['available_buses'] = count($terminalTrips);
            $t['upcoming_buses']  = count($upcoming);
            $t['next_departure']  = $upcoming[0]['departure_time'] ?? null;
            $t['next_departure_date'] = $upcoming[0]['departure_date'] ?? null;
            $t['min_price']       = $prices ? (float) min($prices) : null;
            $t['operators']       = array_values(array_unique(array_filter(array_column($terminalTrips, 'vendor_name'))));
            $t['buses_by_vendor'] = $this->groupBusesByVendor($upcoming);
            $t['amenities_map']  = terminal_amenities($t['amenities'] ?? null)['amenities_map'];
            $t['amenities_list'] = terminal_amenities($t['amenities'] ?? null)['amenities_list'];
            unset($t['amenities']);

            $t['est_duration_minutes'] = null;
            if (! empty($upcoming[0]) && ! empty($upcoming[0]['departure_time']) && ! empty($upcoming[0]['arrival_time'])) {
                $t['est_duration_minutes'] = $this->minutesBetween(
                    $upcoming[0]['departure_time'],
                    $upcoming[0]['arrival_time']
                );
            }

            if ($userLat !== null && $userLng !== null) {
                $t['distance_km'] = $this->haversine($userLat, $userLng, (float) $t['lat'], (float) $t['lng']);
            } else {
                $t['distance_km'] = null;
            }
        }

        return $terminals;
    }

    /**
     * Group upcoming trips by their operating vendor, so the map info card
     * can list available buses per vendor.
     */
    private function groupBusesByVendor(array $trips): array
    {
        $groups = [];
        foreach ($trips as $t) {
            // Only trips with seats still available are shown as available.
            if ((int) ($t['available_seats'] ?? 0) <= 0) {
                continue;
            }
            $vendorId   = (int) ($t['vendor_id'] ?? 0);
            $vendorName = (string) ($t['vendor_name'] ?? 'Other');
            $key        = $vendorId . ':' . $vendorName;
            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'vendor_id'   => $vendorId,
                    'vendor_name' => $vendorName,
                    'vendor_logo' => $t['vendor_logo'] ?? null,
                    'buses'       => [],
                ];
            }
            $groups[$key]['buses'][] = [
                'trip_id'             => (int) $t['id'],
                'bus_id'              => (int) ($t['bus_id'] ?? 0),
                'route_id'            => (int) ($t['route_id'] ?? 0),
                'status'              => $t['status'] ?? 'scheduled',
                'bus_name'            => $t['bus_name'] ?? null,
                'bus_type'            => $t['bus_type'] ?? null,
                'registration_number' => $t['registration_number'] ?? null,
                'departure_date'      => $t['departure_date'] ?? null,
                'departure_time'      => $t['departure_time'] ?? null,
                'arrival_time'        => $t['arrival_time'] ?? null,
                'price'               => (float) ($t['price'] ?? 0),
                'available_seats'     => (int) ($t['available_seats'] ?? 0),
                'total_seats'         => (int) ($t['total_seats'] ?? 0),
                'vendor_id'           => (int) ($t['vendor_id'] ?? 0),
                'origin_city'         => $t['origin_city'] ?? null,
                'origin_city_id'      => (int) ($t['origin_city_id'] ?? 0),
                'destination_city'    => $t['destination_city'] ?? null,
                'destination_city_id' => (int) ($t['destination_city_id'] ?? 0),
            ];
        }
        usort($groups, fn ($a, $b) => strcasecmp($a['vendor_name'], $b['vendor_name']));
        return array_values($groups);
    }

    /**
     * Map vendor_id -> list of terminal ids the vendor is registered to.
     */
    private function vendorTerminalMap(): array
    {
        $rows = \Config\Database::connect()
            ->table('vendor_terminals')
            ->select('vendor_id, terminal_id')
            ->get()->getResultArray();

        $map = [];
        foreach ($rows as $r) {
            $map[(int) $r['vendor_id']][] = (int) $r['terminal_id'];
        }
        return $map;
    }

    /**
     * Map terminal_id -> city_id for every terminal.
     */
    private function terminalCityMap(): array
    {
        $rows = \Config\Database::connect()
            ->table('terminals')
            ->select('id, city_id')
            ->where('deleted_at', null)
            ->get()->getResultArray();

        $map = [];
        foreach ($rows as $r) {
            $map[(int) $r['id']] = (int) $r['city_id'];
        }
        return $map;
    }

    /**
     * Resolve which terminal(s) a trip can be boarded at for a vendor that may
     * be registered at multiple terminals. A trip is attributed to every one of
     * the vendor's terminals in the trip's origin city; falls back to the
     * vendor's primary terminal.
     *
     * @return int[]
     */
    private function resolveTripTerminals(array $trip, array $vendorTerminals, array $terminalCities): array
    {
        $vendorId = (int) ($trip['vendor_id'] ?? 0);
        $assigned = $vendorTerminals[$vendorId] ?? [];

        if (empty($assigned)) {
            return [];
        }

        $originCity = (int) ($trip['origin_city_id'] ?? 0);
        $matches = [];
        foreach ($assigned as $tid) {
            if (($terminalCities[$tid] ?? 0) === $originCity) {
                $matches[] = $tid;
            }
        }

        if (! empty($matches)) {
            return $matches;
        }

        $primary = (int) ($trip['vendor_terminal_id'] ?? 0);
        if (in_array($primary, $assigned, true)) {
            return [$primary];
        }

        return [$assigned[0]];
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return round($earth * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
    }

    private function minutesBetween(string $from, string $to): int
    {
        [$h1, $m1] = array_map('intval', explode(':', $from));
        [$h2, $m2] = array_map('intval', explode(':', $to));
        $mins = $h2 * 60 + $m2 - ($h1 * 60 + $m1);
        if ($mins < 0) {
            $mins += 24 * 60;
        }
        return $mins;
    }
}

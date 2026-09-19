<?php

namespace App\Services;

/**
 * RoadRouteService
 * Fetches drivable road geometries from OSRM's public OpenStreetMap routing
 * server and caches the result. The API server proxies OSRM so mobile devices
 * only talk to the trusted LAN API instead of a flaky public endpoint.
 */
class RoadRouteService
{
    private const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&alternatives=false';

    private const MAX_POINTS    = 500;
    private const CACHE_TTL     = 3600; // seconds
    private const REQUEST_TTL   = 15;   // seconds

    /**
     * Resolve a road geometry between two points.
     *
     * @return array{coords: array<int, array{0: float, 1: float}>, distance_km: float, duration_sec: int}|null
     */
    public function route(float $fromLat, float $fromLng, float $toLat, float $toLng): ?array
    {
        $fromLat = round($fromLat, 6);
        $fromLng = round($fromLng, 6);
        $toLat   = round($toLat, 6);
        $toLng   = round($toLng, 6);

        $key = 'road_route_' . md5("{$fromLat},{$fromLng};{$toLat},{$toLng}");

        $cache = \Config\Services::cache();
        $cached = $cache->get($key);
        if (is_array($cached)) {
            return $cached;
        }

        $url = str_replace('{coords}', "{$fromLng},{$fromLat};{$toLng},{$toLat}", self::OSRM_URL);

        $ctx = stream_context_create([
            'http' => [
                'timeout'       => self::REQUEST_TTL,
                'ignore_errors' => true,
                'header'        => "User-Agent: BusLine/1.0 (+https://doc.busline.local)\r\n",
            ],
            'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true],
        ]);

        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) {
            return null;
        }

        $data    = json_decode($body, true);
        $route   = $data['routes'][0] ?? null;
        $geometry = $route['geometry']['coordinates'] ?? [];

        if (($data['code'] ?? '') !== 'Ok' || count($geometry) < 2) {
            return null;
        }

        // Return the full geometry so the drawn line always reaches the exact
        // destination (like the Results/trips page, which sends the whole
        // polyline). Coordinates are rounded to 5 decimals (~1m) to keep the
        // payload compact while retaining every point.
        $points = [];
        foreach ($geometry as $p) {
            if (isset($p[0], $p[1])) {
                $points[] = [round((float) $p[1], 5), round((float) $p[0], 5)]; // [lat, lng]
            }
        }

        if (count($points) < 2) {
            return null;
        }

        $result = [
            'coords'       => $points,
            'distance_km'  => round(((float) ($route['distance'] ?? 0)) / 1000, 1),
            'duration_sec' => (int) ($route['duration'] ?? 0),
        ];

        $cache->save($key, $result, self::CACHE_TTL);

        return $result;
    }
}
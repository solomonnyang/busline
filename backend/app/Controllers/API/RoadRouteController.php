<?php

namespace App\Controllers\API;

use App\Services\RoadRouteService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * RoadRouteController
 * Public proxy that resolves a drivable road geometry between two coordinates.
 * The real routing happens on OSRM; this endpoint keeps mobile devices on the
 * trusted API origin and caches hot routes.
 */
class RoadRouteController extends BaseApiController
{
    public function index(): ResponseInterface
    {
        $fromLat = (float) ($this->request->getGet('from_lat') ?? 0);
        $fromLng = (float) ($this->request->getGet('from_lng') ?? 0);
        $toLat   = (float) ($this->request->getGet('to_lat') ?? 0);
        $toLng   = (float) ($this->request->getGet('to_lng') ?? 0);

        if (abs($fromLat) > 90 || abs($toLat) > 90 || abs($fromLng) > 180 || abs($toLng) > 180) {
            return api_error('Invalid coordinates.', 422);
        }
        if (($fromLat === 0.0 && $fromLng === 0.0) || ($toLat === 0.0 && $toLng === 0.0)) {
            return api_error('Missing coordinates.', 422);
        }

        $result = (new RoadRouteService())->route($fromLat, $fromLng, $toLat, $toLng);

        if ($result === null) {
            return api_error('Could not compute a road route.', 502);
        }

        return api_success($result);
    }
}
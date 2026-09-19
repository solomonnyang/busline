<?php

namespace App\Controllers\API;

use App\Models\CityModel;
use App\Models\TripModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * TripController
 * Public endpoints for searching trips and viewing seat maps.
 */
class TripController extends BaseApiController
{
    protected TripModel $trips;

    public function __construct()
    {
        $this->trips = model(TripModel::class);
    }

    /**
     * GET /api/trips?origin=1&destination=2&date=2026-08-10
     * Public trip search.
     */
    public function index(): ResponseInterface
    {
        $origin      = $this->request->getGet('origin');
        $destination = $this->request->getGet('destination');
        $date        = $this->request->getGet('date');

        $trips = $this->trips->search(
            $origin ? (int) $origin : null,
            $destination ? (int) $destination : null,
            $date ? trim($date) : null
        );

        return api_success($trips, count($trips) . ' trip(s) found.');
    }

    /**
     * GET /api/trips/popular?origin={cityId}
     * Cheapest available fare per destination from an origin city, used for
     * the "from ₦X" price hints on the search page. Ordered by popularity.
     */
    public function popular(): ResponseInterface
    {
        $origin = (int) ($this->request->getGet('origin') ?? 0);

        $trips = $this->trips->search($origin ?: null);

        $byDest = [];
        foreach ($trips as $t) {
            // Sold-out trips don't make a useful "from" price.
            if ((int) ($t['available_seats'] ?? 0) <= 0) {
                continue;
            }
            $destId = (int) ($t['destination_city_id'] ?? 0);
            if ($destId === 0) {
                continue;
            }
            $price = (float) ($t['price'] ?? 0);
            if (! isset($byDest[$destId])) {
                $byDest[$destId] = [
                    'destination_city_id' => $destId,
                    'destination_city'    => $t['destination_city'] ?? null,
                    'min_price'           => $price,
                    'trip_count'          => 1,
                ];
            } else {
                $byDest[$destId]['trip_count']++;
                $byDest[$destId]['min_price'] = min($byDest[$destId]['min_price'], $price);
            }
        }

        $rows = array_values($byDest);
        usort($rows, fn ($a, $b) => $b['trip_count'] <=> $a['trip_count']);

        return api_success($rows, count($rows) . ' destination(s) found.');
    }

    /**
     * GET /api/trips/{id}
     * Single trip details.
     */
    public function show(int $id): ResponseInterface
    {
        $trip = $this->trips->detailed($id);
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }
        return api_success($trip);
    }

    /**
     * GET /api/cities
     * Public list of active cities (for search forms).
     */
    public function cities(): ResponseInterface
    {
        $cities = model(CityModel::class)->active();
        return api_success($cities);
    }

    /**
     * GET /api/upcoming-trips
     * Featured/upcoming trips for the home page.
     */
    public function upcoming(): ResponseInterface
    {
        $trips = $this->trips->search();
        return api_success(array_slice($trips, 0, 8));
    }
}

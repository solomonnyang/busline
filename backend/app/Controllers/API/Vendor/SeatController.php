<?php

namespace App\Controllers\API\Vendor;

use App\Models\BusModel;
use App\Models\SeatLayoutTemplateModel;
use App\Models\SeatModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * SeatController
 * Fleet seat management: view a bus's physical seats and regenerate its seat
 * layout from a template or explicit grid.
 */
class SeatController extends BaseVendorController
{
    protected SeatModel $seats;
    protected BusModel  $buses;

    public function __construct()
    {
        $this->seats  = model(SeatModel::class);
        $this->buses  = model(BusModel::class);
    }

    /**
     * GET /api/vendor/buses/(:num)/seats
     */
    public function busSeats(int $busId): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $bus = $this->buses->find($busId);
        if (! $bus || (int) $bus['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Bus not found.', 404);
        }

        return api_success([
            'bus'    => $bus,
            'seats'  => $this->seats->findByBusId($busId),
            'layout' => json_decode($bus['seat_layout'] ?? '[]', true),
        ]);
    }

    /**
     * POST /api/vendor/buses/(:num)/seats/generate
     * Regenerates the physical seats for a bus. The seat_layout on the bus is
     * replaced with the resolved layout and total_seats updated to match.
     */
    public function regenerate(int $busId): ResponseInterface
    {
        $data = $this->validateOrFail([
            'seat_layout_template_id' => 'permit_empty|is_natural_no_zero',
            'seat_layout'             => 'permit_empty',
            'total_seats'             => 'permit_empty|is_natural|less_than[200]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $bus = $this->buses->find($busId);
            if (! $bus || (int) $bus['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Bus not found.', 404);
            }

            $this->requirePermission('buses.manage');

            // Refuse when the bus has active bookings (seats are referenced).
            $active = \Config\Database::connect()->table('bookings')
                ->join('trips', 'trips.id = bookings.trip_id')
                ->where('trips.bus_id', $busId)
                ->whereIn('bookings.status', ['pending', 'confirmed'])
                ->countAllResults();
            if ($active > 0) {
                return api_error('This bus has active bookings and its seats cannot be regenerated.', 422);
            }

            $layout = $this->resolveLayout($data, (int) ($data['total_seats'] ?? $bus['total_seats']), $bus['seat_layout']);
            $totalSeats = $this->layoutSeatCount($layout);
            if ($totalSeats <= 0) {
                $totalSeats = (int) ($data['total_seats'] ?? $bus['total_seats']);
            }

            $this->seats->clearSeats($busId);
            $created = $this->seats->generateSeats($busId, $totalSeats, $layout);

            $this->buses->update($busId, [
                'total_seats' => $created > 0 ? $created : $totalSeats,
                'seat_layout' => $layout ? json_encode($layout) : null,
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'bus.seats_regenerated', 'Bus', $busId, ['seats' => $created]);

            return api_success([
                'bus'         => $this->buses->find($busId),
                'seats'       => $this->seats->findByBusId($busId),
                'created'     => $created,
            ], 'Seats regenerated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * Resolve a layout from seat_layout / template id / existing bus layout.
     */
    private function resolveLayout(array $data, int $totalSeats, ?string $existingLayout): ?array
    {
        if (! empty($data['seat_layout'])) {
            $layout = is_string($data['seat_layout']) ? json_decode($data['seat_layout'], true) : $data['seat_layout'];
            if (is_array($layout) && (isset($layout['columns']) || isset($layout['rows']))) {
                return $layout;
            }
            return null;
        }

        if (! empty($data['seat_layout_template_id'])) {
            $template = model(SeatLayoutTemplateModel::class)->find((int) $data['seat_layout_template_id']);
            if (! $template || (int) $template['is_active'] !== 1) {
                throw new \RuntimeException('The selected seat layout template is not available.');
            }
            $decoded = json_decode($template['columns'] ?? '[]', true) ?: [];

            if (is_array($decoded) && ! empty($decoded['rows'])) {
                return ['rows' => $decoded['rows']];
            }

            $columns = is_array($decoded) ? $decoded : [];
            if (count($columns) === 0) {
                return null;
            }
            return [
                'columns' => $columns,
                'rows'    => $totalSeats > 0 ? (int) ceil($totalSeats / count($columns)) : 10,
            ];
        }

        if (! empty($existingLayout)) {
            $decoded = json_decode($existingLayout, true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }

    private function layoutSeatCount(?array $layout): int
    {
        if (! $layout) {
            return 0;
        }
        if (! empty($layout['rows']) && is_array($layout['rows'])) {
            $count = 0;
            foreach ($layout['rows'] as $rowCells) {
                if (! is_array($rowCells)) {
                    continue;
                }
                foreach ($rowCells as $cell) {
                    if ($cell !== null && $cell !== '' && $cell !== 'DRIVER') {
                        $count++;
                    }
                }
            }
            return $count;
        }
        if (! empty($layout['columns'])) {
            return count($layout['columns']) * (int) ($layout['rows'] ?? 0);
        }
        return 0;
    }
}

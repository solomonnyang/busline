<?php

namespace App\Controllers\API;

use App\Models\BookingModel;
use App\Models\BookingSeatModel;
use App\Models\BusCategoryModel;
use App\Models\BusModel;
use App\Models\CityModel;
use App\Models\DriverModel;
use App\Models\NotificationModel;
use App\Models\RouteModel;
use App\Models\RouteStopModel;
use App\Models\SeatLayoutTemplateModel;
use App\Models\SeatModel;
use App\Models\StaffModel;
use App\Models\TerminalModel;
use App\Models\TripDriverModel;
use App\Models\TripModel;
use App\Models\TripRecurrenceModel;
use App\Models\VendorModel;
use App\Models\VendorWithdrawalModel;
use App\Services\BookingService;
use App\Services\StaffPermissionService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * VendorController
 * Vendor-facing management endpoints (requires role: vendor).
 * Scoped to the authenticated vendor's own records.
 */
class VendorController extends BaseApiController
{
    protected BusModel      $buses;
    protected RouteModel    $routes;
    protected TripModel     $trips;
    protected VendorModel   $vendors;

    public function __construct()
    {
        $this->buses   = model(BusModel::class);
        $this->routes  = model(RouteModel::class);
        $this->trips   = model(TripModel::class);
        $this->vendors = model(VendorModel::class);
    }

    /**
     * Ensure the vendor's account has been approved before management.
     */
    protected function requireApprovedVendor(): array
    {
        $vendor = $this->currentVendor();
        if ($vendor['approval_status'] !== 'approved') {
            throw new \RuntimeException('Your vendor account is pending approval. This action is unavailable.');
        }
        return $vendor;
    }

    /**
     * Resolve the acting vendor profile: the account owner, or a staff member
     * whose access is scoped to their staff record's vendor. Attaches the
     * resolved vendor to the request so AuditService can pick up the scope.
     */
    public function currentVendor(): array
    {
        $user = $this->currentUser();
        $vendor = model(VendorModel::class)->findByUserId((int) $user['id']);

        if (! $vendor) {
            $staff = model(StaffModel::class)->findByUserId((int) $user['id']);
            if ($staff && (int) $staff['is_active'] === 1) {
                $vendor = model(VendorModel::class)->find((int) $staff['vendor_id']);
            }
        }

        if (! $vendor) {
            throw new \RuntimeException('Vendor profile not found.');
        }

        $this->request->vendor = $vendor;
        return $vendor;
    }

    /**
     * True when the current user is the vendor account owner (not staff).
     */
    protected function isOwner(): bool
    {
        $user = $this->currentUser();
        return ($user['role_slug'] ?? '') === 'vendor';
    }

    /**
     * The current user's staff row, or null when they are the owner.
     */
    protected function staff(): ?array
    {
        $user = $this->currentUser();
        if (($user['role_slug'] ?? '') === 'vendor_staff') {
            return model(StaffModel::class)->findByUserId((int) $user['id']);
        }
        return null;
    }

    /**
     * Permission check: owners always pass; staff permissions are derived
     * purely from the staff role — never hand-assigned.
     */
    protected function hasPermission(string $permission): bool
    {
        if ($this->isOwner()) {
            return true;
        }

        $staff = $this->staff();
        if (! $staff || (int) $staff['is_active'] !== 1) {
            return false;
        }

        return in_array($permission, StaffPermissionService::forRole($staff['role']), true);
    }

    /**
     * @throws \RuntimeException when the permission is missing
     */
    protected function requirePermission(string $permission): void
    {
        if (! $this->hasPermission($permission)) {
            throw new \RuntimeException('You do not have permission to perform this action.');
        }
    }

    /**
     * Intercept every call and restrict this bus-booking dashboard to
     * vendors whose profile type is `bus_booking`.
     */
    public function _remap(string $method, ...$params)
    {
        try {
            $vendor = $this->currentVendor();
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }

        if (($vendor['type'] ?? 'bus_booking') !== 'bus_booking') {
            return api_error('This area is only available to bus booking vendors.', 403);
        }

        if (! method_exists($this, $method)) {
            return api_error('Endpoint not found.', 404);
        }

        return $this->{$method}(...$params);
    }

    /**
     * GET /api/vendor/dashboard
     * Widgets: today's trips, total/pending bookings, revenue, available buses,
     * today's occupancy, plus recent bookings, upcoming trips, recent payouts,
     * unread notifications and the review summary.
     */
    public function dashboard(): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $staff  = $this->staff();
        $isOwner = $this->isOwner();
        $role    = $staff ? $staff['role'] : 'owner';

        $db    = \Config\Database::connect();
        $today = date('Y-m-d');

        $user   = $this->currentUser();
        $unread = model(NotificationModel::class)->unreadCount((int) $user['id']);

        // Driver staff get a conductor-style dashboard of their assigned trips.
        if ($role === 'driver') {
            return $this->driverDashboard($vendor, $staff, $today, $unread);
        }

        $fullAccess  = $isOwner || in_array($role, ['manager', 'operator'], true);
        $canTrips    = $fullAccess || $this->hasPermission('trips.manage');
        $canBookings = $fullAccess || $this->hasPermission('bookings.manage');
        $canFleet    = $fullAccess || $this->hasPermission('buses.manage');
        $canFinance  = $fullAccess || $this->hasPermission('finance.manage') || $this->hasPermission('analytics.view');
        $canReviews  = $fullAccess || $this->hasPermission('reviews.reply');

        $widgets  = [];
        $sections = [];

        if ($canTrips) {
            $widgets['today_trips'] = $this->trips->where('vendor_id', $vendor['id'])
                ->where('departure_date', $today)->countAllResults();

            $occupancy = $db->table('trips')
                ->select(
                    'COUNT(trips.id) as trip_count,
                     COALESCE(SUM(buses.total_seats),0) as total_capacity,
                     COALESCE(SUM(buses.total_seats) - SUM(trips.available_seats),0) as filled'
                )
                ->join('buses', 'buses.id = trips.bus_id', 'left')
                ->where('trips.vendor_id', $vendor['id'])
                ->where('trips.departure_date', $today)
                ->get()->getRowArray();

            $capacity = (int) ($occupancy['total_capacity'] ?? 0);
            $filled   = (int) ($occupancy['filled'] ?? 0);

            $widgets['occupancy_today'] = [
                'trips'          => (int) ($occupancy['trip_count'] ?? 0),
                'total_capacity' => $capacity,
                'filled'         => $filled,
                'rate'           => $capacity > 0 ? round($filled / $capacity * 100, 1) : 0,
            ];

            $sections[] = 'upcoming_trips';
            $upcomingTrips = $this->trips->select(
                'trips.*, buses.bus_name, origin.name as origin_city, destination.name as destination_city'
            )
                ->join('buses', 'buses.id = trips.bus_id', 'left')
                ->join('routes', 'routes.id = trips.route_id', 'left')
                ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
                ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
                ->where('trips.vendor_id', $vendor['id'])
                ->where('trips.departure_date >=', $today)
                ->where('trips.status', 'scheduled')
                ->orderBy('trips.departure_date', 'ASC')
                ->findAll(10);
        }

        if ($canBookings || $canFinance) {
            $bookingStats = $this->trips->select(
                'COUNT(bookings.id) as total_bookings, COALESCE(SUM(bookings.total_amount),0) as revenue'
            )
                ->join('bookings', "bookings.trip_id = trips.id AND bookings.status IN ('confirmed','completed')", 'left')
                ->where('trips.vendor_id', $vendor['id'])
                ->first();

            if ($canBookings) {
                $widgets['total_bookings']   = (int) ($bookingStats['total_bookings'] ?? 0);
                $widgets['pending_bookings'] = $db->table('bookings')
                    ->join('trips', 'trips.id = bookings.trip_id', 'inner')
                    ->where('trips.vendor_id', $vendor['id'])
                    ->where('bookings.status', 'pending')
                    ->countAllResults();

                $sections[] = 'recent_bookings';
                $recentBookings = $this->trips->select(
                    'bookings.*, buses.bus_name, origin.name as origin_city, destination.name as destination_city,
                     bookings.total_amount, bookings.booking_number, bookings.status, bookings.booking_date'
                )
                    ->join('bookings', 'bookings.trip_id = trips.id', 'left')
                    ->join('buses', 'buses.id = trips.bus_id', 'left')
                    ->join('routes', 'routes.id = trips.route_id', 'left')
                    ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
                    ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
                    ->where('trips.vendor_id', $vendor['id'])
                    ->orderBy('bookings.created_at', 'DESC')
                    ->findAll(10);
            }

            if ($canFinance) {
                $widgets['revenue'] = (float) ($bookingStats['revenue'] ?? 0);
            }
        }

        if ($canFleet) {
            $widgets['available_buses'] = $this->buses->where('vendor_id', $vendor['id'])
                ->where('status', 'active')->countAllResults();
        }

        if ($canFinance) {
            $sections[] = 'recent_payouts';
            $recentPayouts = model(VendorWithdrawalModel::class)
                ->where('vendor_id', $vendor['id'])
                ->orderBy('id', 'DESC')
                ->findAll(5);
        }

        if ($canReviews) {
            $sections[] = 'reviews';
            $reviews = model(\App\Models\ReviewModel::class);
            $vendorId = (int) $vendor['id'];
            $reviewSummary = [
                'average'   => $reviews->averageForVendor($vendorId),
                'total'     => $reviews->where('vendor_id', $vendorId)->countAllResults(),
                'published' => $reviews->where('vendor_id', $vendorId)->where('status', 'published')->countAllResults(),
                'pending'   => $reviews->where('vendor_id', $vendorId)->where('status', 'pending')->countAllResults(),
            ];
        }

        return api_success([
            'dashboard_meta'   => [
                'role'  => $role,
                'owner' => $isOwner,
            ],
            'widgets'          => $widgets,
            'sections'         => $sections,
            'recent_bookings'  => $recentBookings ?? [],
            'upcoming_trips'   => $upcomingTrips ?? [],
            'recent_payouts'   => $recentPayouts ?? [],
            'review_summary'   => $reviewSummary ?? null,
            'unread'           => $unread,
            'vendor'           => $vendor,
        ]);
    }

    /**
     * Conductor-style dashboard for `driver` staff: their assigned trips and a
     * quick scan shortcut. Owner/managers never reach this branch.
     */
    protected function driverDashboard(array $vendor, array $staff, string $today, int $unread): ResponseInterface
    {
        $driver = model(DriverModel::class)->findByStaffId((int) $staff['id']);

        $driverTrips = [];
        if ($driver) {
            $driverTrips = $this->trips->select(
                'trips.*, buses.bus_name, buses.registration_number, origin.name as origin_city, destination.name as destination_city'
            )
                ->join('trip_drivers', 'trip_drivers.trip_id = trips.id', 'inner')
                ->join('drivers', 'drivers.id = trip_drivers.driver_id', 'inner')
                ->join('buses', 'buses.id = trips.bus_id', 'left')
                ->join('routes', 'routes.id = trips.route_id', 'left')
                ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
                ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
                ->where('trip_drivers.driver_id', $driver['id'])
                ->where('trips.vendor_id', $vendor['id'])
                ->where('trips.departure_date >=', $today)
                ->where('trips.status', 'scheduled')
                ->orderBy('trips.departure_date', 'ASC')
                ->orderBy('trips.departure_time', 'ASC')
                ->findAll(10);
        }

        $todayTrips = count(array_filter($driverTrips, fn ($t) => ($t['departure_date'] ?? '') === $today));

        return api_success([
            'dashboard_meta' => ['role' => 'driver', 'owner' => false],
            'widgets'        => [
                'today_trips'  => $todayTrips,
                'next_trip'    => $driverTrips[0] ?? null,
            ],
            'sections'       => ['driver_trips'],
            'driver_trips'   => $driverTrips,
            'unread'         => $unread,
            'vendor'         => $vendor,
        ]);
    }

    // ------------------------------------------------------------------
    // Buses
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/buses
     */
    public function buses(): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $buses = $this->buses->findByVendorId((int) $vendor['id']);

        return api_success(array_map(fn ($bus) => $this->decorateBus($bus), $buses));
    }

    /**
     * GET /api/vendor/buses/{id}
     */
    public function busDetail(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $bus = $this->buses->find($id);
        if (! $bus || (int) $bus['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Bus not found.', 404);
        }

        return api_success($this->decorateBus($bus));
    }

    /**
     * POST /api/vendor/buses
     */
    public function createBus(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'bus_name'                 => 'required|min_length[2]|max_length[150]',
            'registration_number'      => 'required|is_unique[buses.registration_number]|max_length[50]',
            'bus_type'                 => 'permit_empty|max_length[100]',
            'category_id'              => 'permit_empty|is_natural_no_zero',
            'seat_layout_template_id'  => 'permit_empty|is_natural_no_zero',
            'total_seats'              => 'permit_empty|is_natural|less_than[200]',
            'terminal_id'              => 'required|is_natural_no_zero',
            'status'                   => 'permit_empty|in_list[active,inactive,maintenance]',
            'seat_layout'              => 'permit_empty',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('buses.manage');

            $terminalId = (int) $data['terminal_id'];
            if (! in_array($terminalId, $this->vendors->terminalIds((int) $vendor['id']), true)) {
                return api_error('The selected terminal is not one of your registered terminals.', 422);
            }

            $category = $this->resolveCategory($data);
            $totalSeats = (int) ($data['total_seats'] ?? 0);
            $layout = $this->resolveLayout($data, $totalSeats, null);
            if ($layout !== null) {
                $count = $this->layoutSeatCount($layout);
                if ($count > 0) {
                    $totalSeats = $count;
                }
            }
            if ($totalSeats <= 0) {
                $totalSeats = 40; // No template and no count supplied → default 2+2 coach.
            }

            $busId = $this->buses->insert([
                'vendor_id'           => $vendor['id'],
                'terminal_id'         => $terminalId,
                'bus_name'            => $data['bus_name'],
                'registration_number' => strtoupper($data['registration_number']),
                'bus_type'            => $category['name'],
                'category_id'         => $category['id'],
                'total_seats'         => $totalSeats,
                'seat_layout'         => $layout ? json_encode($layout) : null,
                'status'              => $data['status'] ?? 'active',
            ]);

            // Generate the physical seat layout.
            model(SeatModel::class)->generateSeats($busId, $totalSeats, $layout);

            return api_success($this->decorateBus($this->buses->find($busId)), 'Bus added successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/buses/{id}
     */
    public function updateBus(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'bus_name'                 => 'required|min_length[2]|max_length[150]',
            'registration_number'      => "required|max_length[50]|is_unique[buses.registration_number,id,{$id}]",
            'bus_type'                 => 'permit_empty|max_length[100]',
            'category_id'              => 'permit_empty|is_natural_no_zero',
            'seat_layout_template_id'  => 'permit_empty|is_natural_no_zero',
            'total_seats'              => 'permit_empty|is_natural|less_than[200]',
            'terminal_id'              => 'required|is_natural_no_zero',
            'status'                   => 'permit_empty|in_list[active,inactive,maintenance]',
            'seat_layout'              => 'permit_empty',
        ]);

        $vendor = $this->currentVendor();
        $bus = $this->buses->where('id', $id)->where('vendor_id', $vendor['id'])->first();

        if (! $bus) {
            return api_error('Bus not found.', 404);
        }

        $this->requirePermission('buses.manage');

        $terminalId = (int) $data['terminal_id'];
        if (! in_array($terminalId, $this->vendors->terminalIds((int) $vendor['id']), true)) {
            return api_error('The selected terminal is not one of your registered terminals.', 422);
        }

        $category = $this->resolveCategory($data);
        $totalSeats = (int) ($data['total_seats'] ?? 0);
        $newLayout = $this->resolveLayout($data, $totalSeats, $bus['seat_layout']);

        $seatLayoutJson = $bus['seat_layout'];
        $note = 'Bus updated successfully.';

        if ($newLayout !== null) {
            $newJson = json_encode($newLayout);
            if ($newJson !== $bus['seat_layout']) {
                if ($this->busHasActiveBookings((int) $id)) {
                    // Seats must match the layout, so keep the existing one.
                    $note = 'Bus updated, but the seat layout was kept because this bus already has bookings.';
                } else {
                    $seatLayoutJson = $newJson;
                    if (isset($newLayout['rows'])) {
                        $totalSeats = $this->layoutSeatCount($newLayout) ?: $totalSeats;
                    }
                    model(SeatModel::class)->clearSeats((int) $id);
                    model(SeatModel::class)->generateSeats((int) $id, $totalSeats, $newLayout);
                }
            } elseif (isset($newLayout['rows'])) {
                // Grid unchanged — keep total seats aligned with the grid.
                $totalSeats = $this->layoutSeatCount($newLayout) ?: $totalSeats;
            }
        }

        if ($totalSeats <= 0) {
            $totalSeats = (int) $bus['total_seats'];
        }

        $this->buses->update($id, [
            'terminal_id'         => $terminalId,
            'bus_name'            => $data['bus_name'],
            'registration_number' => strtoupper($data['registration_number']),
            'bus_type'            => $category['name'],
            'category_id'         => $category['id'],
            'total_seats'         => $totalSeats,
            'seat_layout'         => $seatLayoutJson,
            'status'              => $data['status'] ?? $bus['status'],
        ]);

        return api_success($this->decorateBus($this->buses->find($id)), $note);
    }

    /**
     * PUT /api/vendor/buses/{id}/fleet
     * Update the extended fleet fields (manufacturer, model, year, amenities,
     * photos, notes). The core bus fields live on PUT /api/vendor/buses/{id}.
     */
    public function updateBusFleet(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'manufacturer' => 'permit_empty|max_length[100]',
            'model'        => 'permit_empty|max_length[100]',
            'year'         => 'permit_empty|is_natural|greater_than_equal_to[1950]|less_than_equal_to[2100]',
            'amenities'    => 'permit_empty',
            'photos'       => 'permit_empty',
            'notes'        => 'permit_empty|max_length[2000]',
        ]);

        $vendor = $this->currentVendor();
        $bus = $this->buses->find($id);
        if (! $bus || (int) $bus['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Bus not found.', 404);
        }

        $this->requirePermission('buses.manage');

        $payload = [];
        foreach (['manufacturer', 'model', 'year', 'notes'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] !== '' && $data[$field] !== null) {
                $payload[$field] = $data[$field];
            }
        }
        foreach (['amenities', 'photos'] as $jsonField) {
            if (array_key_exists($jsonField, $data) && $data[$jsonField] !== null) {
                $value = is_string($data[$jsonField]) ? json_decode($data[$jsonField], true) : $data[$jsonField];
                $payload[$jsonField] = is_array($value) ? json_encode(array_values($value)) : null;
            }
        }

        if ($payload) {
            $this->buses->update($id, $payload);
        }

        return api_success($this->decorateBus($this->buses->find($id)), 'Fleet details updated successfully.');
    }

    /**
     * Decode JSON columns on a bus row so the frontend gets arrays/objects.
     */
    private function decorateBus(array $bus): array
    {
        foreach (['seat_layout', 'amenities', 'photos'] as $key) {
            $bus[$key] = json_decode($bus[$key] ?? 'null', true);
        }
        return $bus;
    }

    /**
     * Resolve the bus category from category_id, bus_type, or the default.
     * Returns ['id' => ?int, 'name' => string].
     */
    private function resolveCategory(array $data): array
    {
        $categories = model(BusCategoryModel::class);

        if (! empty($data['category_id'])) {
            $category = $categories->find((int) $data['category_id']);
            if (! $category || (int) $category['is_active'] !== 1) {
                throw new \RuntimeException('The selected bus category is not available.');
            }
            return ['id' => (int) $category['id'], 'name' => $category['name']];
        }

        if (! empty($data['bus_type'])) {
            $category = $categories->where('is_active', 1)
                ->groupStart()
                    ->where('slug', strtolower(trim($data['bus_type'])))
                    ->orWhere('name', $data['bus_type'])
                ->groupEnd()
                ->first();
            if ($category) {
                return ['id' => (int) $category['id'], 'name' => $category['name']];
            }
        }

        $default = $categories->findBySlug('standard');
        return [
            'id'   => $default ? (int) $default['id'] : null,
            'name' => $default['name'] ?? ($data['bus_type'] ?? 'standard'),
        ];
    }

    /**
     * Resolve the seat layout from an explicit seat_layout, a selected
     * template, or keep the existing one. Returns null to use the default 2+2.
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

            // Full multi-row grid template.
            if (is_array($decoded) && ! empty($decoded['rows'])) {
                return ['rows' => $decoded['rows']];
            }

            // Legacy flat-columns template: repeat the pattern across enough rows.
            $columns = is_array($decoded) ? $decoded : [];
            if (count($columns) === 0) {
                return null;
            }
            $rows = $totalSeats > 0 ? (int) ceil($totalSeats / count($columns)) : 10;
            return [
                'columns' => $columns,
                'rows'    => $rows,
            ];
        }

        if (! empty($existingLayout)) {
            $decoded = json_decode($existingLayout, true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }

    /**
     * Count physical seats a layout produces (grid rows or legacy columns x rows).
     */
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

    /**
     * True when any booking on this bus's trips is still pending or confirmed.
     */
    private function busHasActiveBookings(int $busId): bool
    {
        $db = \Config\Database::connect();
        return $db->table('bookings')
            ->join('trips', 'trips.id = bookings.trip_id')
            ->where('trips.bus_id', $busId)
            ->whereIn('bookings.status', ['pending', 'confirmed'])
            ->countAllResults() > 0;
    }

    /**
     * DELETE /api/vendor/buses/{id}
     */
    public function deleteBus(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $bus = $this->buses->where('id', $id)->where('vendor_id', $vendor['id'])->first();

        if (! $bus) {
            return api_error('Bus not found.', 404);
        }

        $this->requirePermission('buses.manage');

        $tripCount = $this->trips->where('bus_id', $id)->whereIn('status', ['scheduled', 'in_progress'])->countAllResults();
        if ($tripCount > 0) {
            return api_error('This bus has upcoming trips and cannot be deleted.', 422);
        }

        $this->buses->delete($id);
        return api_success(null, 'Bus deleted.');
    }

    // ------------------------------------------------------------------
    // Routes
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/routes
     */
    public function routes(): ResponseInterface
    {
        $vendor = $this->currentVendor();
        return api_success($this->routes->allDetailed((int) $vendor['id']));
    }

    /**
     * POST /api/vendor/routes
     */
    public function createRoute(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'origin_city_id'      => 'required|is_natural_no_zero',
            'destination_city_id' => 'required|is_natural_no_zero|differs[origin_city_id]',
            'distance_km'         => 'required|numeric|greater_than[0]',
            'estimated_duration'  => 'permit_empty|is_natural',
            'status'              => 'permit_empty|in_list[active,inactive]',
        ]);

        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('routes.manage');

        $routeId = $this->routes->insert([
            'vendor_id'           => $vendor['id'],
            'origin_city_id'      => (int) $data['origin_city_id'],
            'destination_city_id' => (int) $data['destination_city_id'],
            'distance_km'         => (float) $data['distance_km'],
            'estimated_duration'  => $data['estimated_duration'] ?? null,
            'status'              => $data['status'] ?? 'active',
        ]);

        return api_success($this->routes->find($routeId), 'Route created successfully.', 201);
    }

    /**
     * PUT /api/vendor/routes/{id}
     */
    public function updateRoute(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'origin_city_id'      => 'required|is_natural_no_zero',
            'destination_city_id' => 'required|is_natural_no_zero|differs[origin_city_id]',
            'distance_km'         => 'required|numeric|greater_than[0]',
            'estimated_duration'  => 'permit_empty|is_natural',
            'status'              => 'permit_empty|in_list[active,inactive]',
        ]);

        $vendor = $this->currentVendor();
        $route = $this->routes->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $route) {
            return api_error('Route not found.', 404);
        }

        $this->requirePermission('routes.manage');

        $this->routes->update($id, [
            'origin_city_id'      => (int) $data['origin_city_id'],
            'destination_city_id' => (int) $data['destination_city_id'],
            'distance_km'         => (float) $data['distance_km'],
            'estimated_duration'  => $data['estimated_duration'] ?? $route['estimated_duration'],
            'status'              => $data['status'] ?? $route['status'],
        ]);

        return api_success($this->routes->find($id), 'Route updated successfully.');
    }

    /**
     * DELETE /api/vendor/routes/{id}
     */
    public function deleteRoute(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $route = $this->routes->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $route) {
            return api_error('Route not found.', 404);
        }

        $this->requirePermission('routes.manage');

        $tripCount = $this->trips->where('route_id', $id)->countAllResults();
        if ($tripCount > 0) {
            return api_error('This route is referenced by trips and cannot be deleted.', 422);
        }

        $this->routes->delete($id);
        return api_success(null, 'Route deleted.');
    }

    /**
     * GET /api/vendor/routes/{id}
     * Single route with city names, its stop list, and trip count.
     */
    public function routeDetail(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $routes = $this->routes->allDetailed((int) $vendor['id']);
        $route = null;
        foreach ($routes as $r) {
            if ((int) $r['id'] === $id) {
                $route = $r;
                break;
            }
        }

        if (! $route) {
            return api_error('Route not found.', 404);
        }

        $route['stops']      = model(RouteStopModel::class)->findByRouteId($id);
        $route['trip_count'] = $this->trips->where('route_id', $id)->countAllResults();

        return api_success($route);
    }

    /**
     * GET /api/vendor/routes/{id}/stops
     */
    public function routeStops(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $route = $this->routes->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $route) {
            return api_error('Route not found.', 404);
        }

        return api_success(model(RouteStopModel::class)->findByRouteId($id));
    }

    /**
     * PUT /api/vendor/routes/{id}/stops
     * Replace the route's stop list.
     * Body: { stops: [{ city_id?, name, stop_order?, arrival_offset?, departure_offset? }, ...] }
     */
    public function updateRouteStops(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'stops' => 'required',
        ]);

        $vendor = $this->currentVendor();
        $route = $this->routes->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $route) {
            return api_error('Route not found.', 404);
        }

        $this->requirePermission('routes.manage');

        model(RouteStopModel::class)->sync($id, (array) $data['stops']);

        return api_success(model(RouteStopModel::class)->findByRouteId($id), 'Route stops updated successfully.');
    }

    /**
     * GET /api/vendor/cities
     * Active cities for route creation dropdowns.
     */
    public function cities(): ResponseInterface
    {
        return api_success(model(CityModel::class)->active());
    }

    /**
     * GET /api/vendor/bus-categories
     * Active bus categories for the bus type picker.
     */
    public function busCategories(): ResponseInterface
    {
        return api_success(model(BusCategoryModel::class)->findActive());
    }

    /**
     * GET /api/vendor/seat-layout-templates
     * Active seat arrangement templates for the vendor's bus form.
     */
    public function seatLayoutTemplates(): ResponseInterface
    {
        return api_success(model(SeatLayoutTemplateModel::class)->findActive());
    }

    /**
     * GET /api/vendor/terminals
     * Terminals the authenticated vendor is registered to, for bus assignment.
     */
    public function terminals(): ResponseInterface
    {
        $vendor = $this->currentVendor();
        return api_success($this->vendors->terminals((int) $vendor['id']));
    }

    /**
     * GET /api/vendor/terminals/all
     * All active terminals the vendor may register to, for the terminal picker.
     */
    public function allTerminals(): ResponseInterface
    {
        $terminals = model(TerminalModel::class)
            ->select('terminals.id, terminals.city_id, terminals.name, terminals.address, terminals.lat, terminals.lng, cities.name as city_name, cities.state as city_state')
            ->join('cities', 'cities.id = terminals.city_id', 'left')
            ->where('terminals.is_active', 1)
            ->where('terminals.deleted_at', null)
            ->orderBy('cities.name', 'ASC')
            ->orderBy('terminals.name', 'ASC')
            ->findAll();

        return api_success($terminals);
    }

    /**
     * PUT /api/vendor/terminals
     * Let the vendor choose the terminals they operate from.
     * Body: { terminal_ids: [id, ...] }
     */
    public function updateTerminals(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'terminal_ids' => 'required',
        ]);

        $vendor = $this->requireApprovedVendor();

        $ids = array_values(array_unique(array_filter(
            array_map('intval', (array) $data['terminal_ids']),
            fn ($id) => $id > 0
        )));

        if (empty($ids)) {
            return api_error('Select at least one terminal.', 422);
        }

        $active = model(TerminalModel::class)
            ->select('id')
            ->whereIn('id', $ids)
            ->where('is_active', 1)
            ->where('deleted_at', null)
            ->findAll();

        $validIds = array_map('intval', array_column($active, 'id'));
        if (count($validIds) !== count($ids)) {
            return api_error('One or more selected terminals are not available.', 422);
        }

        $this->vendors->syncTerminals((int) $vendor['id'], $validIds);

        return api_success($this->vendors->terminals((int) $vendor['id']), 'Terminals updated successfully.');
    }

    /**
     * POST /api/vendor/terminals
     * Add a new terminal and register the vendor to it immediately.
     * Body: { city_id, name, address?, lat, lng, amenities?, photo_url? }
     */
    public function createTerminal(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'city_id'   => 'required|is_natural_no_zero',
            'name'      => 'required|min_length[2]|max_length[160]',
            'address'   => 'permit_empty|max_length[255]',
            'lat'       => 'required|numeric|greater_than_equal_to[-90]|less_than_equal_to[90]',
            'lng'       => 'required|numeric|greater_than_equal_to[-180]|less_than_equal_to[180]',
            'photo_url' => 'permit_empty|max_length[255]',
            'amenities' => 'permit_empty',
        ]);

        $vendor = $this->requireApprovedVendor();

        if (! model(CityModel::class)->find((int) $data['city_id'])) {
            return api_error('City not found.', 404);
        }

        $id = model(TerminalModel::class)->insert([
            'city_id'   => (int) $data['city_id'],
            'name'      => $data['name'],
            'address'   => $data['address'] ?? null,
            'lat'       => (float) $data['lat'],
            'lng'       => (float) $data['lng'],
            'photo_url' => $data['photo_url'] ?? null,
            'amenities' => $this->encodeAmenities($data['amenities'] ?? null),
            'is_active' => 1,
        ]);

        $ids   = $this->vendors->terminalIds((int) $vendor['id']);
        $ids[] = (int) $id;
        $this->vendors->syncTerminals((int) $vendor['id'], $ids);

        return api_success($this->vendors->terminals((int) $vendor['id']), 'Terminal added successfully.', 201);
    }

    /**
     * Normalize amenities input (array or comma-separated string) to a JSON
     * list of labels for storage.
     */
    private function encodeAmenities($amenities): ?string
    {
        if (empty($amenities)) {
            return null;
        }

        if (is_array($amenities)) {
            if (array_is_list($amenities)) {
                $labels = array_map('trim', array_filter($amenities, fn ($v) => trim((string) $v) !== ''));
            } else {
                $labels = [];
                foreach (TERMINAL_AMENITIES as $slug => $label) {
                    if (! empty($amenities[$slug])) {
                        $labels[] = $label;
                    }
                }
            }
        } else {
            $labels = array_map('trim', array_filter(explode(',', (string) $amenities)));
        }

        return json_encode(array_values($labels));
    }

    // ------------------------------------------------------------------
    // Trips
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/trips
     */
    public function trips(): ResponseInterface
    {
        $vendor = $this->currentVendor();

        $filters = array_filter([
            'status'   => $this->request->getGet('status'),
            'route_id' => $this->request->getGet('route_id'),
            'bus_id'   => $this->request->getGet('bus_id'),
        ]);

        $trips = $this->trips->findByVendorId((int) $vendor['id'], $filters);

        $result = array_map(function ($trip) {
            return $this->trips->detailed((int) $trip['id']);
        }, $trips);

        return api_success($result);
    }

    /**
     * POST /api/vendor/trips
     */
    public function createTrip(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'bus_id'          => 'required|is_natural_no_zero',
            'route_id'        => 'required|is_natural_no_zero',
            'terminal_id'     => 'permit_empty|is_natural_no_zero',
            'departure_date'  => 'required|valid_date',
            'departure_time'  => 'required|valid_time',
            'arrival_time'    => 'permit_empty|valid_time',
            'price'           => 'required|numeric|greater_than[0]',
            'status'          => 'permit_empty|in_list[scheduled,cancelled]',
            'drivers'         => 'permit_empty',
            'recurrence'      => 'permit_empty',
        ]);

        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('trips.manage');

        // Verify the bus and route belong to this vendor.
        $bus = $this->buses->where('id', $data['bus_id'])->where('vendor_id', $vendor['id'])->first();
        if (! $bus) {
            return api_error('Bus not found for this vendor.', 404);
        }
        $route = $this->routes->where('id', $data['route_id'])->where('vendor_id', $vendor['id'])->first();
        if (! $route) {
            return api_error('Route not found for this vendor.', 404);
        }

        // Optional per-trip terminal must be one the vendor is registered to.
        $terminalId = null;
        if (! empty($data['terminal_id'])) {
            $terminalId = (int) $data['terminal_id'];
            if (! in_array($terminalId, $this->vendors->terminalIds((int) $vendor['id']), true)) {
                return api_error('Terminal is not registered to this vendor.', 422);
            }
        }

        $availableSeats = $data['available_seats'] ?? $bus['total_seats'];

        $tripId = $this->trips->insert([
            'vendor_id'       => $vendor['id'],
            'bus_id'          => (int) $data['bus_id'],
            'route_id'        => (int) $data['route_id'],
            'terminal_id'     => $terminalId,
            'departure_date'  => $data['departure_date'],
            'departure_time'  => $data['departure_time'],
            'arrival_time'    => $data['arrival_time'] ?? null,
            'price'           => (float) $data['price'],
            'available_seats' => $availableSeats,
            'status'          => $data['status'] ?? 'scheduled',
        ]);

        // Optional driver + recurrence setup at creation.
        if (! empty($data['drivers']) && is_array($data['drivers'])) {
            model(TripDriverModel::class)->sync((int) $tripId, $this->normalizeDriverAssignments($data['drivers']));
        }
        if (! empty($data['recurrence']) && is_array($data['recurrence'])) {
            model(TripRecurrenceModel::class)->saveForTrip((int) $tripId, $data['recurrence']);
        }

        return api_success($this->tripDetailPayload((int) $tripId), 'Trip created successfully.', 201);
    }

    /**
     * PUT /api/vendor/trips/{id}
     */
    public function updateTrip(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'bus_id'          => 'required|is_natural_no_zero',
            'route_id'        => 'required|is_natural_no_zero',
            'terminal_id'     => 'permit_empty|is_natural_no_zero',
            'departure_date'  => 'required|valid_date',
            'departure_time'  => 'required|valid_time',
            'arrival_time'    => 'permit_empty|valid_time',
            'price'           => 'required|numeric|greater_than[0]',
            'available_seats' => 'permit_empty|is_natural',
            'status'          => 'permit_empty|in_list[scheduled,cancelled,in_progress,completed]',
        ]);

        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        $this->requirePermission('trips.manage');

        // Optional per-trip terminal must be one the vendor is registered to.
        if (array_key_exists('terminal_id', $data)) {
            $terminalId = ($data['terminal_id'] === null || $data['terminal_id'] === '')
                ? null
                : (int) $data['terminal_id'];
            if ($terminalId !== null && ! in_array($terminalId, $this->vendors->terminalIds((int) $vendor['id']), true)) {
                return api_error('Terminal is not registered to this vendor.', 422);
            }
        } else {
            $terminalId = $trip['terminal_id'];
        }

        $this->trips->update($id, [
            'bus_id'          => (int) $data['bus_id'],
            'route_id'        => (int) $data['route_id'],
            'terminal_id'     => $terminalId,
            'departure_date'  => $data['departure_date'],
            'departure_time'  => $data['departure_time'],
            'arrival_time'    => $data['arrival_time'] ?? $trip['arrival_time'],
            'price'           => (float) $data['price'],
            'available_seats' => $data['available_seats'] ?? $trip['available_seats'],
            'status'          => $data['status'] ?? $trip['status'],
        ]);

        return api_success($this->trips->detailed($id), 'Trip updated successfully.');
    }

    /**
     * DELETE /api/vendor/trips/{id}
     */
    public function deleteTrip(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        $this->requirePermission('trips.manage');

        $bookingCount = model(BookingModel::class)->where('trip_id', $id)->whereIn('status', ['pending', 'confirmed'])->countAllResults();
        if ($bookingCount > 0) {
            return api_error('This trip has active bookings and cannot be deleted.', 422);
        }

        $this->trips->delete($id);
        return api_success(null, 'Trip deleted.');
    }

    /**
     * GET /api/vendor/trips/{id}
     * Trip detail for the vendor: live seat map (reserved vs available), every
     * booking on the trip with the seats each passenger holds, plus the driver
     * assignments and recurrence rule.
     */
    public function tripDetail(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        return api_success($this->tripDetailPayload((int) $id));
    }

    /**
     * Build the full vendor trip-detail payload.
     */
    private function tripDetailPayload(int $id): array
    {
        try {
            $map = (new BookingService())->seatMap($id);
        } catch (\RuntimeException $e) {
            throw new \RuntimeException($e->getMessage());
        }

        $bookingRows = model(BookingModel::class)
            ->select('bookings.*, users.name as customer_name, users.email as customer_email')
            ->join('customers', 'customers.id = bookings.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->where('bookings.trip_id', $id)
            ->orderBy('bookings.created_at', 'DESC')
            ->findAll();

        $bookings = array_map(function ($bk) {
            return [
                'booking' => $bk,
                'seats'   => model(BookingSeatModel::class)->findByBookingId((int) $bk['id']),
            ];
        }, $bookingRows);

        return [
            'trip'       => $map['trip'],
            'seats'      => $map['seats'],
            'layout'     => $map['layout'],
            'bookings'   => $bookings,
            'drivers'    => model(TripDriverModel::class)->findByTripId($id),
            'recurrence' => model(TripRecurrenceModel::class)->findDetailedByTripId($id),
        ];
    }

    /**
     * GET /api/vendor/trips/{id}/drivers
     * The trip's current driver assignments.
     */
    public function tripDrivers(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        return api_success(model(TripDriverModel::class)->findByTripId($id));
    }

    /**
     * PUT /api/vendor/trips/{id}/drivers
     * Replace the trip's driver assignments.
     * Body: { drivers: [{ driver_id, role }] } (role: driver|assistant)
     */
    public function updateTripDrivers(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'drivers' => 'required',
        ]);

        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        $this->requirePermission('trips.manage');

        model(TripDriverModel::class)->sync($id, $this->normalizeDriverAssignments($data['drivers']));

        return api_success(model(TripDriverModel::class)->findByTripId($id), 'Driver assignments updated successfully.');
    }

    /**
     * PUT /api/vendor/trips/{id}/recurrence
     * Set the trip's repeat rule (one per trip; delete when empty).
     * Body: { frequency: daily|weekly|custom, days_of_week?: [0-6], repeat_until?: YYYY-MM-DD }
     */
    public function updateTripRecurrence(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'frequency'    => 'permit_empty|in_list[daily,weekly,custom]',
            'days_of_week' => 'permit_empty',
            'repeat_until' => 'permit_empty|valid_date',
        ]);

        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        $this->requirePermission('trips.manage');

        if (empty($data['frequency'])) {
            // Clearing the recurrence: delete the existing rule.
            model(TripRecurrenceModel::class)->where('trip_id', $id)->delete();
            return api_success(null, 'Recurrence removed.');
        }

        model(TripRecurrenceModel::class)->saveForTrip($id, $data);

        return api_success(model(TripRecurrenceModel::class)->findDetailedByTripId($id), 'Recurrence updated successfully.');
    }

    /**
     * POST /api/vendor/trips/{id}/availability
     * Recompute the trip's available seats from the actual seat reservations.
     */
    public function refreshTripAvailability(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $trip = $this->trips->where('id', $id)->where('vendor_id', $vendor['id'])->first();
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        $this->requirePermission('trips.manage');

        (new BookingService())->recomputeAvailability($id);

        return api_success([
            'trip'            => $this->trips->detailed($id),
            'available_seats' => (int) $this->trips->find($id)['available_seats'],
        ], 'Availability recalculated.');
    }

    /**
     * Normalize driver assignment payload into driver_id => role pairs.
     * Accepts [{ driver_id, role }] or { driver_id, assistant_id }.
     */
    private function normalizeDriverAssignments($drivers): array
    {
        $assignments = [];

        if (is_string($drivers)) {
            $drivers = json_decode($drivers, true);
        }
        if (! is_array($drivers)) {
            return [];
        }

        // { driver_id, assistant_id } shape.
        if (! empty($drivers['driver_id'])) {
            $assignments[(int) $drivers['driver_id']] = 'driver';
            if (! empty($drivers['assistant_id'])) {
                $assignments[(int) $drivers['assistant_id']] = 'assistant';
            }
            return $assignments;
        }

        // [{ driver_id, role }] shape.
        foreach ($drivers as $row) {
            if (! is_array($row)) {
                continue;
            }
            $driverId = (int) ($row['driver_id'] ?? 0);
            if ($driverId > 0) {
                $assignments[$driverId] = ($row['role'] ?? 'driver') === 'assistant' ? 'assistant' : 'driver';
            }
        }

        return $assignments;
    }

    // ------------------------------------------------------------------
    // Bookings & tickets
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/bookings
     */
    public function bookings(): ResponseInterface
    {
        $vendor = $this->currentVendor();

        $query = $this->trips->select(
            'bookings.*, trips.route_id, buses.bus_name, buses.registration_number,
             origin.name as origin_city, destination.name as destination_city,
             users.name as customer_name, users.email as customer_email,
             trips.departure_date, trips.departure_time, trips.price as trip_price'
        )
            ->join('bookings', 'bookings.trip_id = trips.id', 'left')
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('customers', 'customers.id = bookings.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->where('trips.vendor_id', $vendor['id'])
            ->where('bookings.id IS NOT NULL');

        if ($status = $this->request->getGet('status')) {
            $query->where('bookings.status', $status);
        }
        if ($payment = $this->request->getGet('payment_status')) {
            $query->where('bookings.payment_status', $payment);
        }
        if ($routeId = $this->request->getGet('route_id')) {
            $query->where('trips.route_id', (int) $routeId);
        }
        if ($from = $this->request->getGet('date_from')) {
            $query->where('trips.departure_date >=', $from);
        }
        if ($to = $this->request->getGet('date_to')) {
            $query->where('trips.departure_date <=', $to);
        }

        $bookings = $query->orderBy('bookings.created_at', 'DESC')->findAll();

        return api_success($bookings);
    }

    /**
     * POST /api/vendor/bookings
     * Walk-in booking on the vendor's own trip (cash sale, confirmed on create).
     * Body: { trip_id, seats: [id,...], passengers: [{name,age,gender,price?}],
     *        customer?: {name,email,phone} }
     */
    public function createBooking(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'trip_id'    => 'required|is_natural_no_zero',
            'seats'      => 'required',
            'passengers' => 'required',
            'customer'   => 'permit_empty',
        ]);

        $vendor = $this->currentVendor();
        $trip = $this->trips->find((int) $data['trip_id']);
        if (! $trip || (int) $trip['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Trip not found for this vendor.', 404);
        }

        $this->requirePermission('bookings.manage');

        try {
            $result = (new BookingService())->vendorBooking(
                (int) $data['trip_id'],
                array_map('intval', (array) $data['seats']),
                (array) $data['passengers'],
                (array) ($data['customer'] ?? [])
            );
            return api_success($result, 'Booking created successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/vendor/bookings/{id}
     */
    public function bookingDetail(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $booking = model(BookingModel::class)->detailed($id);

        if (! $booking) {
            return api_error('Booking not found.', 404);
        }

        $trip = $this->trips->find($booking['trip_id']);
        if (! $trip || (int) $trip['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Booking not found.', 404);
        }

        $seats = model(BookingSeatModel::class)->findByBookingId($id);

        return api_success([
            'booking' => $booking,
            'seats'   => $seats,
        ]);
    }

    /**
     * PUT /api/vendor/bookings/{id}/seats
     * Manually reassign the seats of a booking on the vendor's trip.
     * Body: { seats: [seatId,...], passengers?: [{name,age,gender}] }
     */
    public function updateBookingSeats(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'seats'     => 'required',
            'passengers'=> 'permit_empty',
        ]);

        $vendor = $this->currentVendor();
        $booking = model(BookingModel::class)->find($id);

        if (! $booking) {
            return api_error('Booking not found.', 404);
        }
        $trip = $this->trips->find($booking['trip_id']);
        if (! $trip || (int) $trip['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Booking not found.', 404);
        }

        $this->requirePermission('bookings.manage');

        try {
            $ticket = (new BookingService())->changeSeats(
                (int) $id,
                array_map('intval', (array) $data['seats']),
                (array) ($data['passengers'] ?? [])
            );
            return api_success($ticket, 'Seats updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/vendor/tickets/validate
     * Validate a scanned QR code (check-in).
     * Body: { qr_token }
     */
    public function validateTicket(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'qr_token' => 'required',
        ]);

        try {
            $vendor = $this->currentVendor();
            $this->requirePermission('bookings.manage');
            $ticket = (new BookingService())->validateTicket($data['qr_token']);

            // Ensure the trip belongs to this vendor.
            $booking = $ticket['booking'];
            $trip = $this->trips->find($booking['trip_id']);
            if (! $trip || (int) $trip['vendor_id'] !== (int) $vendor['id']) {
                return api_error('This ticket does not belong to your company.', 403);
            }

            return api_success($ticket, 'Ticket is valid.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/vendor/bookings/{id}/checkin
     * Mark a validated booking as checked in.
     */
    public function checkin(int $id): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $booking = model(BookingModel::class)->find($id);

        if (! $booking) {
            return api_error('Booking not found.', 404);
        }
        $trip = $this->trips->find($booking['trip_id']);
        if (! $trip || (int) $trip['vendor_id'] !== (int) $vendor['id']) {
            return api_error('Booking not found.', 404);
        }
        if ($booking['payment_status'] !== 'paid') {
            return api_error('Payment not confirmed for this booking.', 422);
        }

        $this->requirePermission('bookings.manage');

        model(BookingModel::class)->update($id, [
            'checked_in'   => 1,
            'checked_in_at'=> date('Y-m-d H:i:s'),
            'status'       => 'completed',
        ]);

        return api_success(null, 'Passenger checked in.');
    }

    /**
     * POST /api/vendor/bookings/{id}/confirm
     * Confirm a pending booking (walk-in/oversight).
     */
    public function confirmBooking(int $id): ResponseInterface
    {
        try {
            $this->ownBooking($id);
            $this->requirePermission('bookings.manage');

            $ticket = (new BookingService())->confirm($id);
            return api_success($ticket, 'Booking confirmed successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/vendor/bookings/{id}/cancel
     * Cancel a booking: frees seats and refunds paid payments to the wallet.
     */
    public function cancelBooking(int $id): ResponseInterface
    {
        try {
            $this->ownBooking($id);
            $this->requirePermission('bookings.manage');

            $ticket = (new BookingService())->cancel($id);
            return api_success($ticket, 'Booking cancelled successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/vendor/bookings/{id}/refund
     * Refund a paid booking to the customer's wallet without cancelling it.
     */
    public function refundBooking(int $id): ResponseInterface
    {
        try {
            $this->ownBooking($id);
            $this->requirePermission('bookings.manage');

            $ticket = (new BookingService())->refund($id);
            return api_success($ticket, 'Booking refunded successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/vendor/bookings/{id}/reschedule
     * Move a booking to another of the vendor's trips.
     * Body: { trip_id, seats: [seatId,...], passengers?: [...] }
     */
    public function rescheduleBooking(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'trip_id'    => 'required|is_natural_no_zero',
            'seats'      => 'required',
            'passengers' => 'permit_empty',
        ]);

        try {
            $booking = $this->ownBooking($id);
            $this->requirePermission('bookings.manage');

            $newTrip = $this->trips->where('id', (int) $data['trip_id'])->where('vendor_id', $booking['_vendor_id'])->first();
            if (! $newTrip) {
                return api_error('The destination trip is not one of your trips.', 404);
            }

            $ticket = (new BookingService())->reschedule(
                $id,
                (int) $data['trip_id'],
                array_map('intval', (array) $data['seats']),
                (array) ($data['passengers'] ?? [])
            );
            return api_success($ticket, 'Booking rescheduled successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * Fetch a booking and verify its trip belongs to the acting vendor.
     */
    private function ownBooking(int $id): array
    {
        $vendor = $this->currentVendor();
        $booking = model(BookingModel::class)->find($id);
        if (! $booking) {
            throw new \RuntimeException('Booking not found.');
        }
        $trip = $this->trips->find((int) $booking['trip_id']);
        if (! $trip || (int) $trip['vendor_id'] !== (int) $vendor['id']) {
            throw new \RuntimeException('Booking not found.');
        }
        $booking['_vendor_id'] = (int) $vendor['id'];
        return $booking;
    }

    // ------------------------------------------------------------------
    // Revenue
    // ------------------------------------------------------------------

    /**
     * GET /api/vendor/revenue?from=&to=
     */
    public function revenue(): ResponseInterface
    {
        $vendor = $this->currentVendor();
        $from = $this->request->getGet('from') ?: date('Y-m-d', strtotime('-30 days'));
        $to   = $this->request->getGet('to') ?: date('Y-m-d');

        $db = \Config\Database::connect();

        $rows = $db->table('trips')
            ->select('DATE(bookings.booking_date) as day, COUNT(bookings.id) as bookings, COALESCE(SUM(bookings.total_amount),0) as revenue')
            ->join('bookings', 'bookings.trip_id = trips.id', 'left')
            ->where('trips.vendor_id', $vendor['id'])
            ->where('bookings.status', 'confirmed')
            ->where('bookings.payment_status', 'paid')
            ->where('bookings.booking_date >=', $from . ' 00:00:00')
            ->where('bookings.booking_date <=', $to . ' 23:59:59')
            ->groupBy('DAY(bookings.booking_date)')
            ->get()->getResultArray();

        $totalRevenue = array_sum(array_column($rows, 'revenue'));
        $totalBookings = array_sum(array_column($rows, 'bookings'));

        // Revenue by route (top routes drive the most money).
        $routeRows = $db->table('trips')
            ->select('routes.id as route_id, origin.name as origin_city, destination.name as destination_city,
                      COUNT(bookings.id) as bookings, COALESCE(SUM(bookings.total_amount),0) as revenue')
            ->join('bookings', 'bookings.trip_id = trips.id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('trips.vendor_id', $vendor['id'])
            ->where('bookings.status', 'confirmed')
            ->where('bookings.payment_status', 'paid')
            ->where('bookings.booking_date >=', $from . ' 00:00:00')
            ->where('bookings.booking_date <=', $to . ' 23:59:59')
            ->groupBy('trips.route_id')
            ->orderBy('revenue', 'DESC')
            ->get()->getResultArray();

        // Most recent paid bookings in the period.
        $recentBookings = $db->table('bookings')
            ->select('bookings.id, bookings.booking_number, bookings.total_amount, bookings.created_at,
                      bookings.booking_date,
                      origin.name as origin_city, destination.name as destination_city,
                      buses.bus_name, users.name as customer_name, users.email as customer_email,
                      (SELECT COUNT(*) FROM booking_seats bs WHERE bs.booking_id = bookings.id) as seat_count')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('buses', 'buses.id = trips.bus_id', 'left')
            ->join('customers', 'customers.id = bookings.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->where('trips.vendor_id', $vendor['id'])
            ->where('bookings.status', 'confirmed')
            ->where('bookings.payment_status', 'paid')
            ->where('bookings.booking_date >=', $from . ' 00:00:00')
            ->where('bookings.booking_date <=', $to . ' 23:59:59')
            ->orderBy('bookings.created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        $bestDay = null;
        foreach ($rows as $r) {
            if ($bestDay === null || (float) $r['revenue'] > (float) $bestDay['revenue']) {
                $bestDay = $r;
            }
        }

        return api_success([
            'from'            => $from,
            'to'              => $to,
            'total_revenue'   => (float) $totalRevenue,
            'total_bookings'  => (int) $totalBookings,
            'avg_per_booking' => $totalBookings > 0 ? round($totalRevenue / $totalBookings, 2) : 0,
            'best_day'        => $bestDay,
            'daily'           => $rows,
            'route_breakdown' => $routeRows,
            'recent_bookings' => $recentBookings,
        ]);
    }

    // ------------------------------------------------------------------
    // Wallet & withdrawals
    // ------------------------------------------------------------------

    /**
     * Vendor wallet overview.
     * Balance is derived: all-time paid revenue minus pending/approved
     * withdrawal requests (a pending request holds its amount).
     *
     * GET /api/vendor/wallet
     */
    public function wallet(): ResponseInterface
    {
        $vendor = $this->currentVendor();

        $balance = $this->vendorBalance((int) $vendor['id']);
        $withdrawals = model(VendorWithdrawalModel::class)->findByVendorId((int) $vendor['id']);

        return api_success([
            'earned'      => $balance['earned'],
            'withdrawn'   => $balance['withdrawn'],
            'pending'     => $balance['pending'],
            'available'   => $balance['available'],
            'withdrawals' => $withdrawals,
        ]);
    }

    /**
     * POST /api/vendor/withdrawals
     * Request a payout from the available balance.
     * Body: { amount, bank_name, account_name, account_number }
     */
    public function createWithdrawal(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'amount'         => 'required|numeric|greater_than[0]',
            'bank_name'      => 'required|max_length[100]',
            'account_name'   => 'required|max_length[150]',
            'account_number' => 'required|max_length[30]',
        ]);

        $vendor = $this->requireApprovedVendor();
        $this->requirePermission('finance.manage');

        $balance = $this->vendorBalance((int) $vendor['id']);
        if ($balance['available'] < (float) $data['amount']) {
            return api_error('Insufficient balance for this withdrawal.', 422);
        }

        $id = model(VendorWithdrawalModel::class)->insert([
            'vendor_id'      => (int) $vendor['id'],
            'amount'         => (float) $data['amount'],
            'bank_name'      => $data['bank_name'],
            'account_name'   => $data['account_name'],
            'account_number' => $data['account_number'],
            'reference'      => 'WD' . date('ymd') . strtoupper(bin2hex(random_bytes(3))),
            'status'         => 'pending',
        ]);

        return api_success(model(VendorWithdrawalModel::class)->find($id), 'Withdrawal requested successfully.', 201);
    }

    /**
     * Compute a vendor's payout balances from paid bookings and withdrawals.
     *
     * @return array{earned: float, withdrawn: float, pending: float, available: float}
     */
    protected function vendorBalance(int $vendorId): array
    {
        $db = \Config\Database::connect();

        $earned = (float) ($db->table('trips')
            ->select('COALESCE(SUM(bookings.total_amount),0) as total')
            ->join('bookings', 'bookings.trip_id = trips.id', 'left')
            ->where('trips.vendor_id', $vendorId)
            ->where('bookings.status', 'confirmed')
            ->where('bookings.payment_status', 'paid')
            ->get()->getRow()->total ?? 0);

        $withdrawn = 0.0;
        $pending = 0.0;
        foreach (model(VendorWithdrawalModel::class)->findByVendorId($vendorId, 1000) as $w) {
            if ($w['status'] === 'approved') {
                $withdrawn += (float) $w['amount'];
            } elseif ($w['status'] === 'pending') {
                $pending += (float) $w['amount'];
            }
        }

        return [
            'earned'    => round($earned, 2),
            'withdrawn' => round($withdrawn, 2),
            'pending'   => round($pending, 2),
            'available' => max(0, round($earned - $withdrawn - $pending, 2)),
        ];
    }

    /**
     * PUT /api/vendor/profile
     * Update company profile (owner only) including business verification fields.
     */
    public function updateProfile(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'company_name'      => 'required|min_length[2]|max_length[150]',
            'company_email'     => 'permit_empty|valid_email',
            'company_phone'     => 'permit_empty|max_length[30]',
            'address'           => 'permit_empty|max_length[255]',
            'city'              => 'permit_empty|max_length[100]',
            'country'           => 'permit_empty|max_length[100]',
            'description'       => 'permit_empty',
            'website'           => 'permit_empty|valid_url|max_length[190]',
            'established_year'  => 'permit_empty|is_natural|greater_than_equal_to[1900]|less_than_equal_to[2100]',
            'license_number'    => 'permit_empty|max_length[50]',
            'tin'               => 'permit_empty|max_length[50]',
            'default_currency'  => 'permit_empty|max_length[10]',
            'timezone'          => 'permit_empty|max_length[60]',
            'logo'              => 'permit_empty|max_length[255]',
        ]);

        $vendor = $this->currentVendor();
        if (! $this->isOwner()) {
            return api_error('Only the vendor owner can update the company profile.', 403);
        }

        $payload = $data;
        foreach (['established_year'] as $field) {
            if (array_key_exists($field, $payload) && $payload[$field] !== '' && $payload[$field] !== null) {
                $payload[$field] = (int) $payload[$field];
            }
        }

        model(VendorModel::class)->update($vendor['id'], $payload);

        return api_success(model(VendorModel::class)->find($vendor['id']), 'Profile updated successfully.');
    }
}

<?php

namespace App\Controllers\API;

use App\Models\BookingModel;
use App\Models\BusCategoryModel;
use App\Models\BusModel;
use App\Models\CityModel;
use App\Models\CustomerModel;
use App\Models\DriverModel;
use App\Models\OfferModel;
use App\Models\RoleModel;
use App\Models\RouteModel;
use App\Models\SeatLayoutTemplateModel;
use App\Models\SettingModel;
use App\Models\StaffModel;
use App\Models\TerminalModel;
use App\Models\TripDriverModel;
use App\Models\TripModel;
use App\Models\UserModel;
use App\Models\VendorModel;
use App\Models\VendorWithdrawalModel;
use App\Services\WalletService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * AdminController
 * Super admin endpoints: platform overview, vendor approvals,
 * cities, reports, and system settings.
 */
class AdminController extends BaseApiController
{
    /**
     * GET /api/admin/dashboard
     * Widgets: total vendors, customers, bookings, revenue.
     */
    public function dashboard(): ResponseInterface
    {
        $db = \Config\Database::connect();

        $totalVendors = (new VendorModel())->countAllResults();
        $pendingVendors = (new VendorModel())->where('approval_status', 'pending')->countAllResults();
        $totalCustomers = (new CustomerModel())->countAllResults();
        $totalBookings = (new BookingModel())->countAllResults();
        $revenue = $db->table('bookings')
            ->selectSum('total_amount', 'total')
            ->where('payment_status', 'paid')
            ->get()->getRow();

        $recentBookings = (new BookingModel())->select(
            'bookings.*, trips.departure_date, origin.name as origin_city, destination.name as destination_city,
             vendors.company_name as vendor_name, users.name as customer_name'
        )
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
            ->join('customers', 'customers.id = bookings.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->orderBy('bookings.created_at', 'DESC')
            ->findAll(10);

        $recentVendors = (new VendorModel())->allWithUser();
        $recentVendors = array_slice($recentVendors, 0, 8);

        return api_success([
            'widgets' => [
                'total_vendors'   => $totalVendors,
                'pending_vendors' => $pendingVendors,
                'total_customers' => $totalCustomers,
                'total_bookings'  => $totalBookings,
                'revenue'         => (float) ($revenue->total ?? 0),
            ],
            'recent_bookings' => $recentBookings,
            'recent_vendors'  => $recentVendors,
        ]);
    }

    // ------------------------------------------------------------------
    // Vendor management
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/vendors?status=pending|approved|suspended
     */
    public function vendors(): ResponseInterface
    {
        $status = $this->request->getGet('status');

        $model = new VendorModel();
        if ($status && in_array($status, ['pending', 'approved', 'suspended'], true)) {
            $model->where('approval_status', $status);
        }

        return api_success($model->allWithUser());
    }

    /**
     * PUT /api/admin/vendors/{id}/approve
     * Body: { status: approved|suspended|pending }
     */
    public function approveVendor(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'status' => 'required|in_list[approved,suspended,pending]',
        ]);

        $vendor = model(VendorModel::class)->find($id);
        if (! $vendor) {
            return api_error('Vendor not found.', 404);
        }

        model(VendorModel::class)->update($id, [
            'approval_status' => $data['status'],
            'approved_by'     => $this->currentUser()['id'],
            'approved_at'     => $data['status'] === 'approved' ? date('Y-m-d H:i:s') : $vendor['approved_at'],
        ]);

        // Notify the vendor (best-effort).
        try {
            $vendor = model(VendorModel::class)->find($id);
            $user   = model(UserModel::class)->find($vendor['user_id'] ?? 0);
            if ($user) {
                (new \App\Services\EmailService())->vendorStatus($user, $vendor, $data['status']);
            }
        } catch (\Throwable $e) {
            // ignore mail failures
        }

        return api_success(model(VendorModel::class)->find($id), 'Vendor status updated.');
    }

    /**
     * PUT /api/admin/vendors/{id}
     * Toggle vendor account activation (suspend user).
     */
    public function toggleVendor(int $id): ResponseInterface
    {
        $vendor = model(VendorModel::class)->find($id);
        if (! $vendor) {
            return api_error('Vendor not found.', 404);
        }

        $user = model(UserModel::class)->find($vendor['user_id']);
        model(UserModel::class)->update($user['id'], [
            'is_active' => (int) ! (int) $user['is_active'],
        ]);

        return api_success(null, 'Vendor account status toggled.');
    }

    /**
     * POST /api/admin/vendors
     * Create a vendor account (user + profile) with one or more terminals.
     */
    public function createVendor(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'            => 'required|min_length[2]|max_length[150]',
            'email'           => 'required|valid_email|unique_active_email[users.email]',
            'password'        => 'required|min_length[6]',
            'phone'           => 'permit_empty|max_length[30]',
            'company_name'    => 'required|min_length[2]|max_length[150]',
            'type'            => 'permit_empty|in_list[bus_booking]',
            'company_email'   => 'permit_empty|valid_email',
            'company_phone'   => 'permit_empty|max_length[30]',
            'terminal_id'     => 'permit_empty|is_natural_no_zero',
            'terminal_ids'    => 'permit_empty',
            'address'         => 'permit_empty|max_length[255]',
            'city'            => 'permit_empty|max_length[100]',
            'country'         => 'permit_empty|max_length[100]',
            'description'     => 'permit_empty',
            'approval_status' => 'permit_empty|in_list[pending,approved,suspended]',
        ]);

        $terminalIds = $this->resolveTerminalIds($data);
        if ($terminalIds === null) {
            return api_error('One or more selected terminals were not found.', 404);
        }

        $role = model(RoleModel::class)->findBySlug('vendor');
        if (! $role) {
            return api_error('Vendor role is not configured.', 500);
        }

        $userId = model(UserModel::class)->insert([
            'name'      => $data['name'],
            'email'     => strtolower($data['email']),
            'phone'     => $data['phone'] ?? null,
            'password'  => $data['password'],
            'role_id'   => $role['id'],
            'is_active' => 1,
        ]);

        $status = $data['approval_status'] ?? 'approved';

        $vendorId = model(VendorModel::class)->insert([
            'user_id'         => $userId,
            'company_name'    => $data['company_name'],
            'company_email'   => $data['company_email'] ?? $data['email'],
            'company_phone'   => $data['company_phone'] ?? $data['phone'] ?? null,
            'address'         => $data['address'] ?? null,
            'city'            => $data['city'] ?? null,
            'country'         => $data['country'] ?? null,
            'description'     => $data['description'] ?? null,
            'type'            => $data['type'] ?? 'bus_booking',
            'approval_status' => $status,
            'approved_by'     => $this->currentUser()['id'],
            'approved_at'     => $status === 'approved' ? date('Y-m-d H:i:s') : null,
        ]);

        model(VendorModel::class)->syncTerminals($vendorId, $terminalIds);

        return api_success(model(VendorModel::class)->findWithUser($vendorId), 'Vendor added successfully.', 201);
    }

    /**
     * PUT /api/admin/vendors/{id}
     * Update a vendor's profile, terminal assignments and approval status.
     */
    public function updateVendor(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'            => 'permit_empty|min_length[2]|max_length[150]',
            'email'           => 'permit_empty|valid_email',
            'phone'           => 'permit_empty|max_length[30]',
            'company_name'    => 'required|min_length[2]|max_length[150]',
            'type'            => 'permit_empty|in_list[bus_booking]',
            'company_email'   => 'permit_empty|valid_email',
            'company_phone'   => 'permit_empty|max_length[30]',
            'terminal_id'     => 'permit_empty|is_natural_no_zero',
            'terminal_ids'    => 'permit_empty',
            'address'         => 'permit_empty|max_length[255]',
            'city'            => 'permit_empty|max_length[100]',
            'country'         => 'permit_empty|max_length[100]',
            'description'     => 'permit_empty',
            'approval_status' => 'permit_empty|in_list[pending,approved,suspended]',
        ]);

        $vendor = model(VendorModel::class)->find($id);
        if (! $vendor) {
            return api_error('Vendor not found.', 404);
        }

        $user = model(UserModel::class)->find($vendor['user_id']);

        if (! empty($data['name'])) {
            model(UserModel::class)->update($user['id'], ['name' => $data['name']]);
        }
        if (array_key_exists('phone', $data)) {
            model(UserModel::class)->update($user['id'], ['phone' => $data['phone'] ?? null]);
        }
        if (! empty($data['email'])) {
            $newEmail = strtolower($data['email']);
            if (strtolower((string) $user['email']) !== $newEmail) {
                $exists = model(UserModel::class)->where('email', $newEmail)->where('id !=', $user['id'])->first();
                if ($exists) {
                    return api_error('Email is already in use.', 422);
                }
                model(UserModel::class)->update($user['id'], ['email' => $newEmail]);
            }
        }

        $status = $data['approval_status'] ?? $vendor['approval_status'];

        model(VendorModel::class)->update($id, [
            'company_name'    => $data['company_name'],
            'company_email'   => $data['company_email'] ?? $vendor['company_email'],
            'company_phone'   => $data['company_phone'] ?? $vendor['company_phone'],
            'address'         => $data['address'] ?? $vendor['address'],
            'city'            => $data['city'] ?? $vendor['city'],
            'country'         => $data['country'] ?? $vendor['country'],
            'description'     => $data['description'] ?? $vendor['description'],
            'type'            => $data['type'] ?? $vendor['type'],
            'approval_status' => $status,
            'approved_by'     => $status !== $vendor['approval_status'] ? $this->currentUser()['id'] : $vendor['approved_by'],
            'approved_at'     => $status === 'approved' ? date('Y-m-d H:i:s') : $vendor['approved_at'],
        ]);

        // Only touch terminal assignments when the request actually sends them,
        // so unrelated profile updates never wipe existing registrations.
        $hasTerminalInput = array_key_exists('terminal_ids', $data) || ! empty($data['terminal_id']);
        if ($hasTerminalInput) {
            $terminalIds = $this->resolveTerminalIds($data);
            if ($terminalIds === null) {
                return api_error('One or more selected terminals were not found.', 404);
            }
            model(VendorModel::class)->syncTerminals($id, $terminalIds);
        }

        return api_success(model(VendorModel::class)->findWithUser($id), 'Vendor updated successfully.');
    }

    /**
     * Normalize terminal assignments from the request. Accepts an array of
     * terminal_ids and/or a single terminal_id. Returns a validated list of
     * terminal ids, or null if any referenced terminal does not exist.
     */
    private function resolveTerminalIds(array $data): ?array
    {
        $ids = [];
        if (! empty($data['terminal_ids']) && is_array($data['terminal_ids'])) {
            foreach ($data['terminal_ids'] as $tid) {
                $tid = (int) $tid;
                if ($tid > 0) {
                    $ids[] = $tid;
                }
            }
        }
        if (! empty($data['terminal_id'])) {
            $ids[] = (int) $data['terminal_id'];
        }
        $ids = array_values(array_unique($ids));

        if (empty($ids)) {
            return [];
        }

        foreach ($ids as $tid) {
            if (! model(TerminalModel::class)->find($tid)) {
                return null;
            }
        }

        return $ids;
    }

    /**
     * DELETE /api/admin/vendors/{id}
     * Permanently remove a vendor and its user account. Active resources
     * (buses, routes, upcoming trips) always block deletion; soft-deleted
     * dependents are purged along with the vendor as long as they carry no
     * customer data (bookings) or deeper references.
     */
    public function deleteVendor(int $id): ResponseInterface
    {
        $vendor = model(VendorModel::class)->find($id);
        if (! $vendor) {
            return api_error('Vendor not found.', 404);
        }

        $db = \Config\Database::connect();

        // Live resources always block deletion.
        $activeBuses  = model(BusModel::class)->where('vendor_id', $id)->countAllResults();
        $activeRoutes = model(RouteModel::class)->where('vendor_id', $id)->countAllResults();
        $activeTrips  = model(TripModel::class)->where('vendor_id', $id)
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->countAllResults();
        if ($activeBuses > 0 || $activeRoutes > 0 || $activeTrips > 0) {
            return api_error(
                'This vendor has buses, routes or upcoming trips and cannot be deleted.',
                422
            );
        }

        // Collect every dependent row - soft-deleted ones still physically
        // exist and reference the vendor, so they must be handled too.
        $tripIds  = array_column($db->table('trips')->select('id')->where('vendor_id', $id)->get()->getResultArray(), 'id');
        $busIds   = array_column($db->table('buses')->select('id')->where('vendor_id', $id)->get()->getResultArray(), 'id');
        $routeIds = array_column($db->table('routes')->select('id')->where('vendor_id', $id)->get()->getResultArray(), 'id');

        // Never destroy customer data referencing the vendor's trips.
        if ($tripIds) {
            $bookings = $db->table('bookings')->whereIn('trip_id', $tripIds)->countAllResults();
            $seatRows = $db->table('booking_seats')->whereIn('trip_id', $tripIds)->countAllResults();
            if ($bookings > 0 || $seatRows > 0) {
                return api_error(
                    'This vendor has trips with existing bookings and cannot be deleted.',
                    422
                );
            }
        }

        $customerRows = model(CustomerModel::class)->where('user_id', (int) $vendor['user_id'])->countAllResults();
        if ($customerRows > 0) {
            return api_error(
                'This vendor account has linked customer data and cannot be deleted.',
                422
            );
        }

        try {
            // Hard-delete dependents (dependency order), then the vendor + user.
            if ($tripIds) {
                $db->table('trips')->where('vendor_id', $id)->delete();
            }
            if ($busIds) {
                $db->table('seats')->whereIn('bus_id', $busIds)->delete();
                $db->table('buses')->where('vendor_id', $id)->delete();
            }
            if ($routeIds) {
                $db->table('routes')->where('vendor_id', $id)->delete();
            }
            $db->table('vendor_terminals')->where('vendor_id', $id)->delete();
            $db->table('vendors')->where('id', $id)->delete();
            $db->table('users')->where('id', (int) $vendor['user_id'])->delete();
        } catch (\Throwable $e) {
            return api_error(
                'This vendor could not be deleted because it has linked records.',
                422
            );
        }

        return api_success(null, 'Vendor deleted permanently.');
    }

    /**
     * POST /api/admin/vendors/{id}/impersonate
     * Issue a signed-in session for a vendor account so an admin can
     * review the vendor dashboard. Returns a session payload ready to use.
     */
    public function impersonateVendor(int $id): ResponseInterface
    {
        $vendor = model(VendorModel::class)->find($id);
        if (! $vendor) {
            return api_error('Vendor not found.', 404);
        }

        $user = model(UserModel::class)->getUserWithProfile((int) $vendor['user_id']);
        if (! $user) {
            return api_error('Vendor account not found.', 404);
        }
        if ((int) $user['is_active'] !== 1) {
            return api_error('This vendor account is deactivated.', 422);
        }

        $user['role_slug'] = 'vendor';
        $session = (new \App\Services\AuthService())->openSession($user, false);

        return api_success([
            'user'    => $session['user'],
            'profile' => model(VendorModel::class)->find($id),
            'token'   => $session['token'],
        ], 'Signed in as vendor.');
    }

    // ------------------------------------------------------------------
    // Bookings & customers
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/bookings
     */
    public function bookings(): ResponseInterface
    {
        $bookings = model(BookingModel::class)->select(
            'bookings.*, trips.departure_date, trips.departure_time,
             origin.name as origin_city, destination.name as destination_city,
             vendors.company_name as vendor_name, users.name as customer_name, users.email as customer_email'
        )
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
            ->join('customers', 'customers.id = bookings.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->orderBy('bookings.created_at', 'DESC')
            ->findAll();

        return api_success($bookings);
    }

    /**
     * GET /api/admin/customers
     */
    public function customers(): ResponseInterface
    {
        return api_success(model(CustomerModel::class)->allWithUser());
    }

    // ------------------------------------------------------------------
    // User management
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/roles
     * Roles available when creating/editing a user.
     */
    public function roles(): ResponseInterface
    {
        return api_success(model(RoleModel::class)->orderBy('id', 'ASC')->findAll());
    }

    /**
     * GET /api/admin/users
     * Every user account across all roles, enriched with role name,
     * linked profile, wallet balance and booking count.
     */
    public function users(): ResponseInterface
    {
        $model = model(UserModel::class)->select(
            'users.id, users.name, users.email, users.phone, users.avatar, users.is_active,
             users.email_verified_at, users.role_id, users.created_at,
             roles.name as role_name, roles.slug as role_slug'
        )
            ->join('roles', 'roles.id = users.role_id', 'left');

        $search = trim((string) $this->request->getGet('search'));
        if ($search !== '') {
            $model->groupStart()
                ->like('users.name', $search)
                ->orLike('users.email', $search)
            ->groupEnd();
        }

        $users = $model->orderBy('users.created_at', 'DESC')->findAll();

        return api_success($this->decorateUsers($users));
    }

    /**
     * POST /api/admin/users
     * Create a user account and the matching customer/vendor profile.
     */
    public function createUser(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'         => 'required|min_length[2]|max_length[150]',
            'email'        => 'required|valid_email|unique_active_email[users.email]',
            'password'     => 'required|min_length[6]',
            'phone'        => 'permit_empty|max_length[30]',
            'role_id'      => 'required|is_natural_no_zero',
            'is_active'    => 'permit_empty|in_list[0,1]',
            'company_name' => 'permit_empty|max_length[150]',
        ]);

        $role = model(RoleModel::class)->find((int) $data['role_id']);
        if (! $role) {
            return api_error('Selected role does not exist.', 422);
        }

        $userId = model(UserModel::class)->insert([
            'name'      => $data['name'],
            'email'     => strtolower($data['email']),
            'phone'     => $data['phone'] ?? null,
            'password'  => $data['password'],
            'role_id'   => (int) $data['role_id'],
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);

        $this->syncProfileForRole((int) $userId, (string) $role['slug'], $data);

        return api_success($this->userItem((int) $userId), 'User created successfully.', 201);
    }

    /**
     * PUT /api/admin/users/{id}
     * Update a user's details, role, activation status or password.
     */
    public function updateUser(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'         => 'permit_empty|min_length[2]|max_length[150]',
            'email'        => 'permit_empty|valid_email',
            'password'     => 'permit_empty|min_length[6]',
            'phone'        => 'permit_empty|max_length[30]',
            'role_id'      => 'permit_empty|is_natural_no_zero',
            'is_active'    => 'permit_empty|in_list[0,1]',
            'company_name' => 'permit_empty|max_length[150]',
        ]);

        $user = model(UserModel::class)->find($id);
        if (! $user) {
            return api_error('User not found.', 404);
        }
        $currentRole = model(RoleModel::class)->find((int) $user['role_id']);

        $updates = [];
        if (! empty($data['name'])) {
            $updates['name'] = $data['name'];
        }
        if (array_key_exists('phone', $data)) {
            $updates['phone'] = $data['phone'] ?? null;
        }
        if (array_key_exists('password', $data) && ! empty($data['password'])) {
            $updates['password'] = $data['password'];
        }
        if (array_key_exists('is_active', $data)) {
            if ((int) $data['is_active'] === 0 && (int) $this->currentUser()['id'] === $id) {
                return api_error('You cannot deactivate your own account.', 422);
            }
            if ((int) $data['is_active'] === 0
                && ($currentRole['slug'] ?? '') === 'super_admin'
                && $this->countActiveSuperAdmins() <= 1
            ) {
                return api_error('You cannot deactivate the last active administrator.', 422);
            }
            $updates['is_active'] = (int) $data['is_active'];
        }

        if (! empty($data['email'])) {
            $newEmail = strtolower($data['email']);
            if (strtolower((string) $user['email']) !== $newEmail) {
                $exists = model(UserModel::class)->where('email', $newEmail)->where('id !=', $id)->first();
                if ($exists) {
                    return api_error('Email is already in use.', 422);
                }
                $updates['email'] = $newEmail;
            }
        }

        if (! empty($data['role_id']) && (int) $data['role_id'] !== (int) $user['role_id']) {
            $newRole = model(RoleModel::class)->find((int) $data['role_id']);
            if (! $newRole) {
                return api_error('Selected role does not exist.', 422);
            }
            if (($currentRole['slug'] ?? '') === 'super_admin'
                && $newRole['slug'] !== 'super_admin'
                && $this->countActiveSuperAdmins() <= 1
            ) {
                return api_error('You cannot demote the last active administrator.', 422);
            }
            $updates['role_id'] = (int) $data['role_id'];
        }

        if ($updates) {
            model(UserModel::class)->update($id, $updates);
        }

        $fresh = model(UserModel::class)->getUserWithProfile($id);
        $this->syncProfileForRole((int) $id, (string) ($fresh['role_slug'] ?? ''), $data);

        return api_success($this->userItem($id), 'User updated successfully.');
    }

    /**
     * PUT /api/admin/users/{id}/toggle
     * Quickly activate/deactivate a user account.
     */
    public function toggleUser(int $id): ResponseInterface
    {
        $user = model(UserModel::class)->find($id);
        if (! $user) {
            return api_error('User not found.', 404);
        }
        if ((int) $this->currentUser()['id'] === $id) {
            return api_error('You cannot deactivate your own account.', 422);
        }

        $role = model(RoleModel::class)->find((int) $user['role_id']);
        if ((int) $user['is_active'] === 1
            && ($role['slug'] ?? '') === 'super_admin'
            && $this->countActiveSuperAdmins() <= 1
        ) {
            return api_error('You cannot deactivate the last active administrator.', 422);
        }

        model(UserModel::class)->update($id, ['is_active' => (int) ! (int) $user['is_active']]);

        return api_success(null, 'User status updated.');
    }

    /**
     * DELETE /api/admin/users/{id}
     * Permanently remove a user account and all of its transactional data:
     * bookings + seats + payments, wallet + transactions, loyalty points,
     * referrals, support tickets + messages, password resets, verification
     * codes, and any vendor-owned resources (buses, routes, trips).
     */
    public function deleteUser(int $id): ResponseInterface
    {
        if ((int) $this->currentUser()['id'] === $id) {
            return api_error('You cannot delete your own account.', 422);
        }

        $user = model(UserModel::class)->withDeleted()->find($id);
        if (! $user) {
            return api_error('User not found.', 404);
        }
        $role = model(RoleModel::class)->find((int) $user['role_id']);

        if (($role['slug'] ?? '') === 'super_admin' && $this->countActiveSuperAdmins() <= 1) {
            return api_error('You cannot delete the last active administrator.', 422);
        }

        if (! $this->purgeUserData($id)) {
            return api_error('This user could not be deleted because it has linked records.', 422);
        }

        return api_success(null, 'User removed permanently.');
    }

    /**
     * Hard-delete a user and every row owned by the account, in FK-safe
     * dependency order, inside a single transaction.
     */
    private function purgeUserData(int $userId): bool
    {
        $db = \Config\Database::connect();

        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();
        if (! $user) {
            return false;
        }
        $email = $user['email'] ?? null;

        $db->transStart();

        try {
            // Relinquish nullable references to the deleted account first.
            $db->table('support_tickets')->where('assigned_to', $userId)->update(['assigned_to' => null]);
            $db->table('vendors')->where('approved_by', $userId)->update(['approved_by' => null]);
            $db->table('support_ticket_messages')->where('sender_id', $userId)->delete();

            // Customer-owned data.
            $customer = $db->table('customers')->where('user_id', $userId)->get()->getRowArray();
            if ($customer) {
                $cid = (int) $customer['id'];

                $bookingIds = array_column(
                    $db->table('bookings')->select('id')->where('customer_id', $cid)->get()->getResultArray(),
                    'id'
                );
                if ($bookingIds) {
                    $db->table('booking_seats')->whereIn('booking_id', $bookingIds)->delete();
                    $db->table('payments')->whereIn('booking_id', $bookingIds)->delete();
                    $db->table('bookings')->whereIn('id', $bookingIds)->delete();
                }

                $walletIds = array_column(
                    $db->table('wallets')->select('id')->where('customer_id', $cid)->get()->getResultArray(),
                    'id'
                );
                if ($walletIds) {
                    $db->table('wallet_transactions')->whereIn('wallet_id', $walletIds)->delete();
                    $db->table('wallets')->whereIn('id', $walletIds)->delete();
                }

                $db->table('loyalty_points')->where('customer_id', $cid)->delete();
                $db->table('referrals')->where('referred_customer_id', $cid)->delete();
                $db->table('referrals')->where('referrer_customer_id', $cid)->delete();
                $db->table('customers')->where('id', $cid)->delete();
            }

            // Vendor-owned data.
            $vendor = $db->table('vendors')->where('user_id', $userId)->get()->getRowArray();
            if ($vendor) {
                $vid = (int) $vendor['id'];

                $tripIds   = array_column($db->table('trips')->select('id')->where('vendor_id', $vid)->get()->getResultArray(), 'id');
                $busIds    = array_column($db->table('buses')->select('id')->where('vendor_id', $vid)->get()->getResultArray(), 'id');
                $routeIds  = array_column($db->table('routes')->select('id')->where('vendor_id', $vid)->get()->getResultArray(), 'id');

                if ($tripIds) {
                    $tripBookingIds = array_column($db->table('bookings')->select('id')->whereIn('trip_id', $tripIds)->get()->getResultArray(), 'id');
                    if ($tripBookingIds) {
                        $db->table('booking_seats')->whereIn('booking_id', $tripBookingIds)->delete();
                        $db->table('payments')->whereIn('booking_id', $tripBookingIds)->delete();
                    }
                    $db->table('booking_seats')->whereIn('trip_id', $tripIds)->delete();
                    $db->table('bookings')->whereIn('trip_id', $tripIds)->delete();
                    $db->table('trips')->whereIn('id', $tripIds)->delete();
                }
                if ($busIds) {
                    $db->table('seats')->whereIn('bus_id', $busIds)->delete();
                    $db->table('buses')->whereIn('id', $busIds)->delete();
                }
                if ($routeIds) {
                    $db->table('routes')->whereIn('id', $routeIds)->delete();
                }

                $db->table('vendor_terminals')->where('vendor_id', $vid)->delete();
                $db->table('vendor_withdrawals')->where('vendor_id', $vid)->delete();
                $db->table('vendors')->where('id', $vid)->delete();
            }

            // Support tickets owned by the account.
            $ticketIds = array_column($db->table('support_tickets')->select('id')->where('user_id', $userId)->get()->getResultArray(), 'id');
            if ($ticketIds) {
                $db->table('support_ticket_messages')->whereIn('ticket_id', $ticketIds)->delete();
                $db->table('support_tickets')->whereIn('id', $ticketIds)->delete();
            }

            if ($email) {
                $db->table('password_resets')->where('email', $email)->delete();
                $db->table('email_verifications')->where('email', $email)->delete();
            }

            $db->table('referrals')->where('referred_user_id', $userId)->delete();
            $db->table('users')->where('referred_by', $userId)->update(['referred_by' => null]);
            $db->table('users')->where('id', $userId)->delete();

            $db->transComplete();

            return $db->transStatus();
        } catch (\Throwable $e) {
            $db->transRollback();

            return false;
        }
    }

    /**
     * GET /api/admin/users/{id}
     * Full detail: user, linked role-specific profile, and wallet overview.
     */
    public function userDetail(int $id): ResponseInterface
    {
        $detail = $this->userDetailPayload($id);
        if (! $detail) {
            return api_error('User not found.', 404);
        }

        return api_success($detail);
    }

    /**
     * PUT /api/admin/users/{id}/details
     * Update the role-specific profile (customer or vendor details).
     */
    public function updateUserDetails(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'address'       => 'permit_empty|max_length[255]',
            'city'          => 'permit_empty|max_length[100]',
            'country'       => 'permit_empty|max_length[100]',
            'date_of_birth' => 'permit_empty|valid_date',
            'gender'        => 'permit_empty|in_list[male,female]',
            'company_name'  => 'permit_empty|max_length[150]',
            'company_email' => 'permit_empty|valid_email',
            'company_phone' => 'permit_empty|max_length[30]',
            'description'   => 'permit_empty',
        ]);

        $user = model(UserModel::class)->find($id);
        if (! $user) {
            return api_error('User not found.', 404);
        }
        $role = model(RoleModel::class)->find((int) $user['role_id']);

        if (($role['slug'] ?? '') === 'customer') {
            $customer = model(CustomerModel::class)->findByUserId($id);
            if (! $customer) {
                $customerId = model(CustomerModel::class)->insert(['user_id' => $id]);
                $customer  = model(CustomerModel::class)->find($customerId);
            }
            $updates = [];
            foreach (['address', 'city', 'country', 'date_of_birth', 'gender'] as $field) {
                if (array_key_exists($field, $data)) {
                    $updates[$field] = $data[$field] !== '' ? $data[$field] : null;
                }
            }
            if ($updates) {
                model(CustomerModel::class)->update((int) $customer['id'], $updates);
            }
        } elseif (($role['slug'] ?? '') === 'vendor') {
            $vendor = model(VendorModel::class)->findByUserId($id);
            if ($vendor) {
                $updates = [];
                foreach (['company_name', 'company_email', 'company_phone', 'address', 'city', 'country', 'description'] as $field) {
                    if (array_key_exists($field, $data)) {
                        $updates[$field] = $data[$field] !== '' ? $data[$field] : null;
                    }
                }
                if ($updates) {
                    model(VendorModel::class)->update((int) $vendor['id'], $updates);
                }
            }
        }

        $detail = $this->userDetailPayload($id);
        return api_success($detail, 'User details updated.');
    }

    /**
     * POST /api/admin/users/{id}/wallet/adjust
     * Manually credit or debit a customer's wallet.
     */
    public function adjustUserWallet(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'type'   => 'required|in_list[credit,debit]',
            'amount' => 'required|numeric|greater_than[0]',
            'note'   => 'permit_empty|max_length[255]',
        ]);

        $user = model(UserModel::class)->find($id);
        if (! $user) {
            return api_error('User not found.', 404);
        }
        $role = model(RoleModel::class)->find((int) $user['role_id']);
        if (($role['slug'] ?? '') !== 'customer') {
            return api_error('Wallet adjustments are only available for customer accounts.', 422);
        }

        $customer = model(CustomerModel::class)->findByUserId($id);
        if (! $customer) {
            return api_error('Customer profile not found.', 404);
        }

        $wallet = new WalletService();
        try {
            if ($data['type'] === 'credit') {
                $wallet->adminCredit((int) $customer['id'], (float) $data['amount'], $data['note'] ?? '');
            } else {
                $wallet->adminDebit((int) $customer['id'], (float) $data['amount'], $data['note'] ?? '');
            }
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }

        return api_success($this->userDetailPayload($id), 'Wallet updated.');
    }

    /**
     * Build the full admin detail payload for one user.
     */
    private function userDetailPayload(int $id): ?array
    {
        $user = $this->userItem($id);
        if (! $user) {
            return null;
        }

        $detail = ['user' => $user, 'profile' => null, 'wallet' => null];

        if ($user['role_slug'] === 'customer') {
            $customer = model(CustomerModel::class)->findByUserId($id);
            $detail['profile'] = $customer;
            if ($customer) {
                $wallet = new WalletService();
                $detail['wallet'] = $wallet->overview((int) $customer['id']);
            }
        } elseif ($user['role_slug'] === 'vendor') {
            $detail['profile'] = model(VendorModel::class)->findByUserId($id);
        }

        return $detail;
    }

    /**
     * Fetch a single user row enriched for admin display.
     */
    private function userItem(int $id): ?array
    {
        $user = model(UserModel::class)->select(
            'users.id, users.name, users.email, users.phone, users.avatar, users.is_active,
             users.email_verified_at, users.role_id, users.created_at,
             roles.name as role_name, roles.slug as role_slug'
        )
            ->join('roles', 'roles.id = users.role_id', 'left')
            ->where('users.id', $id)
            ->first();

        if (! $user) {
            return null;
        }
        $decorated = $this->decorateUsers([$user]);

        return $decorated[0] ?? null;
    }

    /**
     * Enrich raw user rows with role, profile, wallet and booking data.
     */
    private function decorateUsers(array $users): array
    {
        $ids = array_map('intval', array_column($users, 'id'));
        $db  = \Config\Database::connect();

        $customersByUser = [];
        $vendorsByUser   = [];
        if ($ids) {
            foreach (model(CustomerModel::class)->whereIn('user_id', $ids)->findAll() as $c) {
                $customersByUser[(int) $c['user_id']] = $c;
            }
            foreach (model(VendorModel::class)->whereIn('user_id', $ids)->findAll() as $v) {
                $vendorsByUser[(int) $v['user_id']] = $v;
            }
        }

        $customerIds   = array_column($customersByUser, 'id');
        $walletByCust  = [];
        $bookingByCust = [];
        if ($customerIds) {
            foreach ($db->table('wallets')->select('customer_id, balance')->whereIn('customer_id', $customerIds)->get()->getResultArray() as $w) {
                $walletByCust[(int) $w['customer_id']] = (float) $w['balance'];
            }
            foreach ($db->table('bookings')->select('customer_id, COUNT(*) as total')->whereIn('customer_id', $customerIds)->groupBy('customer_id')->get()->getResultArray() as $b) {
                $bookingByCust[(int) $b['customer_id']] = (int) $b['total'];
            }
        }

        $out = [];
        foreach ($users as $u) {
            $cust = $customersByUser[(int) $u['id']] ?? null;
            $ven  = $vendorsByUser[(int) $u['id']] ?? null;
            $out[] = [
                'id'                => (int) $u['id'],
                'name'              => $u['name'],
                'email'             => $u['email'],
                'phone'             => $u['phone'] ?? null,
                'avatar'            => $u['avatar'] ?? null,
                'is_active'         => (int) $u['is_active'],
                'email_verified_at' => $u['email_verified_at'] ?? null,
                'role_id'           => (int) $u['role_id'],
                'role'              => $u['role_name'] ?? null,
                'role_slug'         => $u['role_slug'] ?? null,
                'company_name'      => $ven['company_name'] ?? null,
                'approval_status'   => $ven['approval_status'] ?? null,
                'wallet_balance'    => $cust ? ($walletByCust[(int) $cust['id']] ?? 0.0) : null,
                'bookings_count'    => $cust ? ($bookingByCust[(int) $cust['id']] ?? 0) : null,
                'created_at'        => $u['created_at'] ?? null,
            ];
        }

        return $out;
    }

    /**
     * Create the profile row matching a user's role (customer/vendor) if missing.
     */
    private function syncProfileForRole(int $userId, string $roleSlug, array $data): void
    {
        if ($roleSlug === 'vendor') {
            if (! model(VendorModel::class)->findByUserId($userId)) {
                model(VendorModel::class)->insert([
                    'user_id'         => $userId,
                    'company_name'    => $data['company_name'] ?? $data['name'],
                    'company_email'   => strtolower($data['email'] ?? ''),
                    'company_phone'   => $data['phone'] ?? null,
                    'approval_status' => 'approved',
                    'approved_by'     => $this->currentUser()['id'],
                    'approved_at'     => date('Y-m-d H:i:s'),
                ]);
            }
        } elseif ($roleSlug === 'customer') {
            if (! model(CustomerModel::class)->findByUserId($userId)) {
                model(CustomerModel::class)->insert(['user_id' => $userId]);
            }
        }
    }

    /**
     * Count active (non-deleted, enabled) super admin accounts.
     */
    private function countActiveSuperAdmins(): int
    {
        return (int) model(UserModel::class)
            ->join('roles', 'roles.id = users.role_id')
            ->where('roles.slug', 'super_admin')
            ->where('users.is_active', 1)
            ->countAllResults();
    }

    // ------------------------------------------------------------------
    // Push notifications
    // ------------------------------------------------------------------

    /**
     * POST /api/admin/notifications/send
     * Body: {
     *   title: string,
     *   message: string,
     *   audience: 'all_customers'|'all_vendors'|'all_users'|'specific_users',
     *   user_ids?: number[]   (required when audience is specific_users)
     * }
     * Sends a remote push notification to the selected audience and mirrors it
     * into the users' in-app notification inbox.
     */
    public function sendNotification(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'title'    => 'required|min_length[1]|max_length[150]',
            'message'  => 'required|min_length[1]|max_length[1000]',
            'audience' => 'required|in_list[all_customers,all_vendors,all_users,specific_users]',
        ]);

        $title   = trim($data['title']);
        $message = trim($data['message']);
        $audience = $data['audience'];

        $userIds = match ($audience) {
            'all_customers' => $this->userIdsForRole('customer'),
            'all_vendors'   => $this->userIdsForRole('vendor'),
            'all_users'     => $this->allUserIds(),
            default         => $this->specificUserIds($data),
        };

        if (empty($userIds)) {
            return api_error('No recipients matched the selected audience.', 422);
        }

        $service = new \App\Services\PushNotificationService();
        $service->notifyUsers($userIds, $title, $message, ['source' => 'admin_broadcast']);

        return api_success(
            ['recipients' => count($userIds)],
            'Notification sent.'
        );
    }

    /**
     * GET /api/admin/notifications/stats
     * Summary of registered push tokens for the admin UI.
     */
    public function notificationStats(): ResponseInterface
    {
        $db = \Config\Database::connect();
        $total = (int) $db->table('push_tokens')->where('is_active', 1)->countAllResults();
        $withDevice = (int) $db->table('push_tokens')->where('is_active', 1)->where('device IS NOT NULL')->where('device !=', '')->countAllResults();

        return api_success([
            'active_tokens'     => $total,
            'registered_devices' => $withDevice,
        ]);
    }

    private function userIdsForRole(string $slug): array
    {
        $rows = model(UserModel::class)
            ->select('users.id')
            ->join('roles', 'roles.id = users.role_id')
            ->where('roles.slug', $slug)
            ->where('users.is_active', 1)
            ->findAll();
        return array_values(array_unique(array_map('intval', array_column($rows, 'id'))));
    }

    private function allUserIds(): array
    {
        $rows = model(UserModel::class)
            ->select('users.id')
            ->where('users.is_active', 1)
            ->findAll();
        return array_values(array_unique(array_map('intval', array_column($rows, 'id'))));
    }

    private function specificUserIds(array $data): array
    {
        $ids = $data['user_ids'] ?? [];
        if (! is_array($ids) || empty($ids)) {
            return [];
        }
        $ids = array_unique(array_map('intval', $ids));
        return array_values(array_filter($ids, fn ($id) => $id > 0));
    }

    // ------------------------------------------------------------------
    // Routes & cities
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/routes
     */
    public function routes(): ResponseInterface
    {
        return api_success(model(RouteModel::class)->allDetailed());
    }

    /**
     * GET /api/admin/trips
     * Every trip across all vendors, enriched with bus/route/vendor info and
     * the current driver assignments.
     */
    public function trips(): ResponseInterface
    {
        $filters = array_filter([
            'status'      => $this->request->getGet('status'),
            'vendor_id'   => $this->request->getGet('vendor_id') ? (int) $this->request->getGet('vendor_id') : null,
            'route_id'    => $this->request->getGet('route_id') ? (int) $this->request->getGet('route_id') : null,
        ]);

        $query = model(TripModel::class)
            ->where('trips.deleted_at IS NULL')
            ->orderBy('trips.departure_date', 'DESC')
            ->orderBy('trips.departure_time', 'DESC');

        if (! empty($filters['status'])) {
            $query->where('trips.status', $filters['status']);
        }
        if (! empty($filters['vendor_id'])) {
            $query->where('trips.vendor_id', $filters['vendor_id']);
        }
        if (! empty($filters['route_id'])) {
            $query->where('trips.route_id', $filters['route_id']);
        }

        $rows = $query->findAll(500);

        $result = array_map(function ($trip) {
            $detail = model(TripModel::class)->detailed((int) $trip['id']);
            $detail['drivers'] = model(TripDriverModel::class)->findByTripId((int) $trip['id']);
            return $detail;
        }, $rows);

        return api_success($result);
    }

    /**
     * GET /api/admin/trips/{id}
     * Full trip detail for the admin: trip info, seats, bookings and drivers.
     */
    public function tripDetail(int $id): ResponseInterface
    {
        $trip = model(TripModel::class)->find($id);
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        try {
            $map = (new \App\Services\BookingService())->seatMap($id);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }

        return api_success([
            'trip'     => $map['trip'],
            'seats'    => $map['seats'],
            'layout'   => $map['layout'],
            'drivers'  => model(TripDriverModel::class)->findByTripId($id),
            'bookings' => model(BookingModel::class)
                ->select('bookings.*, users.name as customer_name, users.email as customer_email')
                ->join('customers', 'customers.id = bookings.customer_id', 'left')
                ->join('users', 'users.id = customers.user_id', 'left')
                ->where('bookings.trip_id', $id)
                ->orderBy('bookings.created_at', 'DESC')
                ->findAll(),
        ]);
    }

    /**
     * PUT /api/admin/trips/{id}/drivers
     * Replace a trip's driver assignments. Body: { drivers: [{ driver_id, role }] }
     */
    public function updateTripDrivers(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'drivers' => 'required',
        ]);

        $trip = model(TripModel::class)->find($id);
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        model(TripDriverModel::class)->sync($id, $this->normalizeDriverAssignments($data['drivers']));

        return api_success(
            model(TripDriverModel::class)->findByTripId($id),
            'Driver assignments updated successfully.'
        );
    }

    /**
     * GET /api/admin/drivers
     * Every fleet driver across all vendors, with vendor + staff account info
     * so the admin can assign them to trips.
     */
    public function drivers(): ResponseInterface
    {
        $rows = model(DriverModel::class)
            ->select(
                'drivers.*, vendors.company_name as vendor_name,
                 staff.user_id as staff_user_id, staff.role as staff_role,
                 users.name as staff_name, users.email as staff_email, users.phone as staff_phone,
                 users.role_id as user_role_id'
            )
            ->join('vendors', 'vendors.id = drivers.vendor_id', 'left')
            ->join('staff', 'staff.id = drivers.staff_id', 'left')
            ->join('users', 'users.id = staff.user_id', 'left')
            ->where('drivers.deleted_at IS NULL')
            ->orderBy('drivers.vendor_id', 'ASC')
            ->orderBy('drivers.name', 'ASC')
            ->findAll();

        return api_success($rows);
    }

    /**
     * Normalize a driver assignment payload into driver_id => role pairs.
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
                $assignments[$driverId] = ($row['role'] ?? '') === 'assistant' ? 'assistant' : 'driver';
            }
        }

        return $assignments;
    }

    /**
     * GET /api/admin/cities
     */
    public function cities(): ResponseInterface
    {
        return api_success(model(CityModel::class)->orderBy('name', 'ASC')->findAll());
    }

    /**
     * POST /api/admin/cities
     */
    public function createCity(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'      => 'required|min_length[2]|max_length[120]',
            'state'     => 'permit_empty|max_length[120]',
            'lat'       => 'permit_empty|numeric|greater_than_equal_to[-90]|less_than_equal_to[90]',
            'lng'       => 'permit_empty|numeric|greater_than_equal_to[-180]|less_than_equal_to[180]',
            'is_active' => 'permit_empty|in_list[0,1]',
        ]);

        $cityId = model(CityModel::class)->insert([
            'name'      => $data['name'],
            'state'     => $data['state'] ?? null,
            'lat'       => ! empty($data['lat']) ? (float) $data['lat'] : null,
            'lng'       => ! empty($data['lng']) ? (float) $data['lng'] : null,
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);

        return api_success(model(CityModel::class)->find($cityId), 'City added.', 201);
    }

    /**
     * PUT /api/admin/cities/{id}
     */
    public function updateCity(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'      => 'required|min_length[2]|max_length[120]',
            'state'     => 'permit_empty|max_length[120]',
            'lat'       => 'permit_empty|numeric|greater_than_equal_to[-90]|less_than_equal_to[90]',
            'lng'       => 'permit_empty|numeric|greater_than_equal_to[-180]|less_than_equal_to[180]',
            'is_active' => 'permit_empty|in_list[0,1]',
        ]);

        $city = model(CityModel::class)->find($id);
        if (! $city) {
            return api_error('City not found.', 404);
        }

        model(CityModel::class)->update($id, [
            'name'      => $data['name'],
            'state'     => $data['state'] ?? $city['state'],
            'lat'       => ! empty($data['lat']) ? (float) $data['lat'] : (isset($city['lat']) && $city['lat'] !== null ? (float) $city['lat'] : null),
            'lng'       => ! empty($data['lng']) ? (float) $data['lng'] : (isset($city['lng']) && $city['lng'] !== null ? (float) $city['lng'] : null),
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : $city['is_active'],
        ]);

        return api_success(model(CityModel::class)->find($id), 'City updated.');
    }

    /**
     * DELETE /api/admin/cities/{id}
     */
    public function deleteCity(int $id): ResponseInterface
    {
        $city = model(CityModel::class)->find($id);
        if (! $city) {
            return api_error('City not found.', 404);
        }

        $routes = model(RouteModel::class)
            ->groupStart()
            ->where('origin_city_id', $id)
            ->orWhere('destination_city_id', $id)
            ->groupEnd()
            ->countAllResults();

        if ($routes > 0) {
            return api_error('This city is used by routes and cannot be deleted.', 422);
        }

        model(CityModel::class)->delete($id);
        return api_success(null, 'City deleted.');
    }

    // ------------------------------------------------------------------
    // Bus categories
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/bus-categories
     * All bus categories with the number of buses using each.
     */
    public function busCategories(): ResponseInterface
    {
        $db = \Config\Database::connect();
        $rows = $db->table('bus_categories')
            ->select('bus_categories.*, COUNT(buses.id) as bus_count')
            ->join('buses', 'buses.category_id = bus_categories.id', 'left')
            ->groupBy('bus_categories.id')
            ->orderBy('bus_categories.name', 'ASC')
            ->get()->getResultArray();

        foreach ($rows as &$row) {
            $row['bus_count'] = (int) $row['bus_count'];
            $row['is_active'] = (int) $row['is_active'];
        }
        unset($row);

        return api_success($rows);
    }

    /**
     * POST /api/admin/bus-categories
     */
    public function createBusCategory(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'        => 'required|min_length[2]|max_length[100]',
            'description' => 'permit_empty|max_length[255]',
            'image'       => 'permit_empty|max_length[500]',
            'is_active'   => 'permit_empty|in_list[0,1]',
        ]);

        $slug = $this->uniqueSlug('bus_categories', url_title(strtolower($data['name']), '-', true));

        $id = model(BusCategoryModel::class)->insert([
            'name'        => $data['name'],
            'slug'        => $slug,
            'description' => $data['description'] ?? null,
            'image'       => ! empty($data['image']) ? trim($data['image']) : null,
            'is_active'   => isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);

        return api_success(model(BusCategoryModel::class)->find($id), 'Bus category added.', 201);
    }

    /**
     * PUT /api/admin/bus-categories/{id}
     */
    public function updateBusCategory(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'        => 'required|min_length[2]|max_length[100]',
            'description' => 'permit_empty|max_length[255]',
            'image'       => 'permit_empty|max_length[500]',
            'is_active'   => 'permit_empty|in_list[0,1]',
        ]);

        $category = model(BusCategoryModel::class)->find($id);
        if (! $category) {
            return api_error('Bus category not found.', 404);
        }

        model(BusCategoryModel::class)->update($id, [
            'name'        => $data['name'],
            'slug'        => $this->uniqueSlug('bus_categories', url_title(strtolower($data['name']), '-', true), $id),
            'description' => $data['description'] ?? $category['description'],
            'image'       => array_key_exists('image', $data) ? (! empty($data['image']) ? trim($data['image']) : null) : $category['image'],
            'is_active'   => isset($data['is_active']) ? (int) $data['is_active'] : $category['is_active'],
        ]);

        return api_success(model(BusCategoryModel::class)->find($id), 'Bus category updated.');
    }

    /**
     * DELETE /api/admin/bus-categories/{id}
     */
    public function deleteBusCategory(int $id): ResponseInterface
    {
        $category = model(BusCategoryModel::class)->find($id);
        if (! $category) {
            return api_error('Bus category not found.', 404);
        }

        $busCount = model(BusModel::class)->where('category_id', $id)->countAllResults();
        if ($busCount > 0) {
            return api_error('This category is used by buses and cannot be deleted.', 422);
        }

        $templateCount = model(SeatLayoutTemplateModel::class)->where('category_id', $id)->countAllResults();
        if ($templateCount > 0) {
            return api_error('This category has seat layout templates. Move or delete them first.', 422);
        }

        model(BusCategoryModel::class)->delete($id);
        return api_success(null, 'Bus category deleted.');
    }

    // ------------------------------------------------------------------
    // Offers (promotions / loyalty program)
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/offers
     * All promotional offers shown in the customer promo slider.
     */
    public function offers(): ResponseInterface
    {
        $rows = model(OfferModel::class)->orderBy('id', 'ASC')->findAll();

        foreach ($rows as &$row) {
            $row['is_active']      = (int) $row['is_active'];
            $row['discount_value'] = (float) $row['discount_value'];
        }
        unset($row);

        return api_success($rows);
    }

    /**
     * POST /api/admin/offers
     */
    public function createOffer(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'code'           => 'required|min_length[3]|max_length[50]',
            'title'          => 'required|min_length[2]|max_length[100]',
            'description'    => 'permit_empty|max_length[255]',
            'badge'          => 'permit_empty|max_length[100]',
            'discount_type'  => 'permit_empty|in_list[percent,fixed]',
            'discount_value' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than[1000000]',
            'icon'           => 'permit_empty|max_length[50]',
            'color'          => 'permit_empty|max_length[20]',
            'soft'           => 'permit_empty|max_length[20]',
            'image'          => 'permit_empty|max_length[500]',
            'is_active'      => 'permit_empty|in_list[0,1]',
        ]);

        $code = trim($data['code']);
        if (model(OfferModel::class)->where('code', $code)->countAllResults() > 0) {
            return api_error('An offer with this code already exists.', 422);
        }

        $id = model(OfferModel::class)->insert([
            'code'           => $code,
            'title'          => $data['title'],
            'description'    => $data['description'] ?? null,
            'badge'          => $data['badge'] ?? null,
            'discount_type'  => $data['discount_type'] ?? 'percent',
            'discount_value' => (float) ($data['discount_value'] ?? 0),
            'icon'           => $data['icon'] ?? null,
            'color'          => $data['color'] ?? null,
            'soft'           => $data['soft'] ?? null,
            'image'          => ! empty($data['image']) ? trim($data['image']) : null,
            'is_active'      => isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);

        return api_success(model(OfferModel::class)->find($id), 'Offer added.', 201);
    }

    /**
     * PUT /api/admin/offers/{id}
     */
    public function updateOffer(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'code'           => 'required|min_length[3]|max_length[50]',
            'title'          => 'required|min_length[2]|max_length[100]',
            'description'    => 'permit_empty|max_length[255]',
            'badge'          => 'permit_empty|max_length[100]',
            'discount_type'  => 'permit_empty|in_list[percent,fixed]',
            'discount_value' => 'permit_empty|decimal|greater_than_equal_to[0]|less_than[1000000]',
            'icon'           => 'permit_empty|max_length[50]',
            'color'          => 'permit_empty|max_length[20]',
            'soft'           => 'permit_empty|max_length[20]',
            'image'          => 'permit_empty|max_length[500]',
            'is_active'      => 'permit_empty|in_list[0,1]',
        ]);

        $offer = model(OfferModel::class)->find($id);
        if (! $offer) {
            return api_error('Offer not found.', 404);
        }

        $code = trim($data['code']);
        $duplicate = model(OfferModel::class)->where('code', $code)->where('id !=', $id)->countAllResults();
        if ($duplicate > 0) {
            return api_error('An offer with this code already exists.', 422);
        }

        model(OfferModel::class)->update($id, [
            'code'           => $code,
            'title'          => $data['title'],
            'description'    => $data['description'] ?? $offer['description'],
            'badge'          => $data['badge'] ?? $offer['badge'],
            'discount_type'  => $data['discount_type'] ?? $offer['discount_type'],
            'discount_value' => (float) ($data['discount_value'] ?? $offer['discount_value']),
            'icon'           => $data['icon'] ?? $offer['icon'],
            'color'          => $data['color'] ?? $offer['color'],
            'soft'           => $data['soft'] ?? $offer['soft'],
            'image'          => array_key_exists('image', $data) ? (! empty($data['image']) ? trim($data['image']) : null) : $offer['image'],
            'is_active'      => isset($data['is_active']) ? (int) $data['is_active'] : $offer['is_active'],
        ]);

        return api_success(model(OfferModel::class)->find($id), 'Offer updated.');
    }

    /**
     * DELETE /api/admin/offers/{id}
     */
    public function deleteOffer(int $id): ResponseInterface
    {
        $offer = model(OfferModel::class)->find($id);
        if (! $offer) {
            return api_error('Offer not found.', 404);
        }

        model(OfferModel::class)->delete($id);
        return api_success(null, 'Offer deleted.');
    }

    // ------------------------------------------------------------------
    // Seat layout templates
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/seat-layout-templates
     * All seat arrangement templates with their category.
     */
    public function seatLayoutTemplates(): ResponseInterface
    {
        $rows = model(SeatLayoutTemplateModel::class)->withCategory();

        foreach ($rows as &$row) {
            $row['is_active'] = (int) $row['is_active'];
            $row['category_id'] = $row['category_id'] !== null ? (int) $row['category_id'] : null;
        }
        unset($row);

        return api_success($rows);
    }

    /**
     * POST /api/admin/seat-layout-templates
     */
    public function createSeatLayoutTemplate(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'        => 'required|min_length[2]|max_length[150]',
            'category_id' => 'permit_empty|is_natural_no_zero',
            'description' => 'permit_empty|max_length[255]',
            'columns'     => 'required',
            'is_active'   => 'permit_empty|in_list[0,1]',
        ]);

        $layout = $this->normalizeLayout($data['columns']);
        if (($error = $this->validateLayout($layout)) !== null) {
            return api_error($error, 422);
        }

        $categoryId = null;
        if (! empty($data['category_id'])) {
            $category = model(BusCategoryModel::class)->find((int) $data['category_id']);
            if (! $category) {
                return api_error('Selected bus category does not exist.', 422);
            }
            $categoryId = (int) $data['category_id'];
        }

        $id = model(SeatLayoutTemplateModel::class)->insert([
            'name'        => $data['name'],
            'category_id' => $categoryId,
            'description' => $data['description'] ?? null,
            'columns'     => json_encode($layout),
            'is_active'   => isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);

        $template = model(SeatLayoutTemplateModel::class)->find($id);
        $template['columns'] = json_decode($template['columns'] ?? '[]', true) ?: [];

        return api_success($template, 'Seat layout template added.', 201);
    }

    /**
     * PUT /api/admin/seat-layout-templates/{id}
     */
    public function updateSeatLayoutTemplate(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'        => 'required|min_length[2]|max_length[150]',
            'category_id' => 'permit_empty|is_natural_no_zero',
            'description' => 'permit_empty|max_length[255]',
            'columns'     => 'required',
            'is_active'   => 'permit_empty|in_list[0,1]',
        ]);

        $template = model(SeatLayoutTemplateModel::class)->find($id);
        if (! $template) {
            return api_error('Seat layout template not found.', 404);
        }

        $layout = $this->normalizeLayout($data['columns']);
        if (($error = $this->validateLayout($layout)) !== null) {
            return api_error($error, 422);
        }

        $categoryId = null;
        if (! empty($data['category_id'])) {
            $category = model(BusCategoryModel::class)->find((int) $data['category_id']);
            if (! $category) {
                return api_error('Selected bus category does not exist.', 422);
            }
            $categoryId = (int) $data['category_id'];
        }

        model(SeatLayoutTemplateModel::class)->update($id, [
            'name'        => $data['name'],
            'category_id' => $categoryId,
            'description' => $data['description'] ?? $template['description'],
            'columns'     => json_encode($layout),
            'is_active'   => isset($data['is_active']) ? (int) $data['is_active'] : $template['is_active'],
        ]);

        $updated = model(SeatLayoutTemplateModel::class)->find($id);
        $updated['columns'] = json_decode($updated['columns'] ?? '[]', true) ?: [];

        return api_success($updated, 'Seat layout template updated.');
    }

    /**
     * DELETE /api/admin/seat-layout-templates/{id}
     */
    public function deleteSeatLayoutTemplate(int $id): ResponseInterface
    {
        $template = model(SeatLayoutTemplateModel::class)->find($id);
        if (! $template) {
            return api_error('Seat layout template not found.', 404);
        }

        model(SeatLayoutTemplateModel::class)->delete($id);
        return api_success(null, 'Seat layout template deleted.');
    }

    // ------------------------------------------------------------------
    // Terminals
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/terminals
     * All terminals with city name + number of assigned vendors.
     */
    public function terminals(): ResponseInterface
    {
        $rows = $this->terminalQuery()->orderBy('terminals.name', 'ASC')->get()->getResultArray();

        foreach ($rows as &$t) {
            $amenities = terminal_amenities($t['amenities'] ?? null);
            $t         = array_merge($t, $amenities);
            unset($t['amenities']);
            $t['vendor_count'] = (int) $t['vendor_count'];
            $t['lat']          = (float) $t['lat'];
            $t['lng']          = (float) $t['lng'];
        }

        return api_success($rows);
    }

    /**
     * POST /api/admin/terminals
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
            'is_active' => 'permit_empty|in_list[0,1]',
        ]);

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
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);

        return api_success($this->terminalItem($id), 'Terminal added successfully.', 201);
    }

    /**
     * PUT /api/admin/terminals/{id}
     */
    public function updateTerminal(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'city_id'   => 'permit_empty|is_natural_no_zero',
            'name'      => 'required|min_length[2]|max_length[160]',
            'address'   => 'permit_empty|max_length[255]',
            'lat'       => 'permit_empty|numeric|greater_than_equal_to[-90]|less_than_equal_to[90]',
            'lng'       => 'permit_empty|numeric|greater_than_equal_to[-180]|less_than_equal_to[180]',
            'photo_url' => 'permit_empty|max_length[255]',
            'amenities' => 'permit_empty',
            'is_active' => 'permit_empty|in_list[0,1]',
        ]);

        $terminal = model(TerminalModel::class)->find($id);
        if (! $terminal) {
            return api_error('Terminal not found.', 404);
        }

        if (! empty($data['city_id']) && ! model(CityModel::class)->find((int) $data['city_id'])) {
            return api_error('City not found.', 404);
        }

        model(TerminalModel::class)->update($id, [
            'city_id'   => ! empty($data['city_id']) ? (int) $data['city_id'] : $terminal['city_id'],
            'name'      => $data['name'],
            'address'   => $data['address'] ?? $terminal['address'],
            'lat'       => ! empty($data['lat']) ? (float) $data['lat'] : (float) $terminal['lat'],
            'lng'       => ! empty($data['lng']) ? (float) $data['lng'] : (float) $terminal['lng'],
            'photo_url' => $data['photo_url'] ?? $terminal['photo_url'],
            'amenities' => array_key_exists('amenities', $data)
                ? $this->encodeAmenities($data['amenities'])
                : $terminal['amenities'],
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : (int) $terminal['is_active'],
        ]);

        return api_success($this->terminalItem($id), 'Terminal updated successfully.');
    }

    /**
     * DELETE /api/admin/terminals/{id}
     */
    public function deleteTerminal(int $id): ResponseInterface
    {
        $terminal = model(TerminalModel::class)->find($id);
        if (! $terminal) {
            return api_error('Terminal not found.', 404);
        }

        $db = \Config\Database::connect();
        $vendorCount = model(VendorModel::class)->where('terminal_id', $id)->countAllResults();
        $pivotCount  = $db->table('vendor_terminals')->where('terminal_id', $id)->countAllResults();
        if ($vendorCount > 0 || $pivotCount > 0) {
            return api_error('This terminal has vendors assigned and cannot be deleted.', 422);
        }

        model(TerminalModel::class)->delete($id);
        return api_success(null, 'Terminal deleted.');
    }

    /**
     * Base query for admin terminal listing (city + vendor count).
     * A vendor is counted once even when registered to multiple terminals.
     */
    private function terminalQuery(): \CodeIgniter\Database\BaseBuilder
    {
        $db = \Config\Database::connect();
        return $db->table('terminals')
            ->select('terminals.*, cities.name as city_name, cities.state as city_state, COUNT(DISTINCT vendors.id) as vendor_count')
            ->join('cities', 'cities.id = terminals.city_id', 'left')
            ->join('vendor_terminals as vt', 'vt.terminal_id = terminals.id', 'left')
            ->join('vendors', 'vendors.id = vt.vendor_id AND vendors.deleted_at IS NULL', 'left')
            ->where('terminals.deleted_at', null)
            ->groupBy('terminals.id');
    }

    /**
     * Fetch a single admin-formatted terminal row.
     */
    private function terminalItem(int $id): ?array
    {
        $row = $this->terminalQuery()->where('terminals.id', $id)->get()->getRowArray();
        if (! $row) {
            return null;
        }
        $row['amenities_list'] = terminal_amenities($row['amenities'] ?? null)['amenities_list'];
        $row['amenities_map']  = terminal_amenities($row['amenities'] ?? null)['amenities_map'];
        unset($row['amenities']);
        $row['vendor_count'] = (int) $row['vendor_count'];
        $row['lat']          = (float) $row['lat'];
        $row['lng']          = (float) $row['lng'];
        return $row;
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
    // Reports & settings
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/reports?from=&to=&type=bookings|revenue|trips
     */
    public function reports(): ResponseInterface
    {
        $from = $this->request->getGet('from') ?: date('Y-m-d', strtotime('-30 days'));
        $to   = $this->request->getGet('to') ?: date('Y-m-d');
        $type = $this->request->getGet('type') ?: 'revenue';

        $db = \Config\Database::connect();

        $bookingsByDay = $db->table('bookings')
            ->select('DATE(created_at) as day, COUNT(*) as total, COALESCE(SUM(total_amount),0) as revenue')
            ->where('created_at >=', $from . ' 00:00:00')
            ->where('created_at <=', $to . ' 23:59:59')
            ->groupBy('DATE(created_at)')
            ->orderBy('day', 'ASC')
            ->get()->getResultArray();

        $bookingsByVendor = $db->table('bookings')
            ->select('vendors.company_name as vendor_name, COUNT(bookings.id) as total, COALESCE(SUM(bookings.total_amount),0) as revenue')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
            ->groupBy('vendors.id')
            ->orderBy('total', 'DESC')
            ->get()->getResultArray();

        $topRoutes = $db->table('bookings')
            ->select('origin.name as origin_city, destination.name as destination_city, COUNT(bookings.id) as total')
            ->join('trips', 'trips.id = bookings.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->groupBy('trips.route_id')
            ->orderBy('total', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        return api_success([
            'from'               => $from,
            'to'                 => $to,
            'type'               => $type,
            'bookings_by_day'    => $bookingsByDay,
            'bookings_by_vendor' => $bookingsByVendor,
            'top_routes'         => $topRoutes,
        ]);
    }

    /**
     * GET /api/admin/transactions
     * Combined platform ledger: every customer wallet transaction (top-ups,
     * wallet payments, loyalty redemptions, admin adjustments) plus every
     * non-wallet booking payment (cash / paystack / card / transfer).
     * Wallet-method booking payments are excluded from the payments side
     * because they already exist as wallet debits in wallet_transactions.
     *
     * Query params: source=wallet|payment, status, method, from, to.
     */
    public function transactions(): ResponseInterface
    {
        $db = \Config\Database::connect();

        $source = $this->request->getGet('source');
        $status = $this->request->getGet('status');
        $method = $this->request->getGet('method');
        $from   = $this->request->getGet('from');
        $to     = $this->request->getGet('to');

        if ($source !== null && ! in_array($source, ['wallet', 'payment'], true)) {
            $source = null;
        }
        if ($status !== null && ! in_array($status, ['pending', 'success', 'failed'], true)) {
            $status = null;
        }

        $items = [];

        // Wallet transactions (all types: credit + debit).
        if ($source === null || $source === 'wallet') {
            $builder = $db->table('wallet_transactions')
                ->select(
                    "wallet_transactions.id, 'wallet' AS source, wallet_transactions.type,
                     wallet_transactions.amount, wallet_transactions.reference, wallet_transactions.description,
                     wallet_transactions.status, wallet_transactions.payment_method,
                     COALESCE(wallet_transactions.paid_at, wallet_transactions.created_at) AS occurred_at,
                     wallet_transactions.wallet_id, users.name AS customer_name, users.email AS customer_email"
                )
                ->join('wallets', 'wallets.id = wallet_transactions.wallet_id')
                ->join('customers', 'customers.id = wallets.customer_id')
                ->join('users', 'users.id = customers.user_id');

            if ($status) {
                $builder->where('wallet_transactions.status', $status);
            }
            if ($method) {
                $builder->where('wallet_transactions.payment_method', $method);
            }
            if ($from) {
                $builder->where('wallet_transactions.created_at >=', $from . ' 00:00:00');
            }
            if ($to) {
                $builder->where('wallet_transactions.created_at <=', $to . ' 23:59:59');
            }

            foreach ($builder->get()->getResultArray() as $row) {
                $row['key'] = 'w' . $row['id'];
                $row['id']  = (int) $row['id'];
                $row['amount'] = (float) $row['amount'];
                $row['booking_number'] = null;
                $row['vendor_name'] = null;
                $row['route'] = null;
                $items[] = $row;
            }
        }

        // Booking payments, excluding wallet method (duplicated as wallet debits).
        if ($source === null || $source === 'payment') {
            $builder = $db->table('payments')
                ->select(
                    "payments.id, 'payment' AS source, 'payment' AS type,
                     payments.amount, payments.payment_reference AS reference,
                     CONCAT('Payment for booking ', bookings.booking_number) AS description,
                     payments.status, payments.payment_method,
                     COALESCE(payments.paid_at, payments.created_at) AS occurred_at,
                     NULL AS wallet_id, users.name AS customer_name, users.email AS customer_email,
                     vendors.company_name AS vendor_name,
                     CONCAT(origin.name, ' → ', destination.name) AS route,
                     bookings.booking_number"
                )
                ->join('bookings', 'bookings.id = payments.booking_id')
                ->join('customers', 'customers.id = bookings.customer_id')
                ->join('users', 'users.id = customers.user_id')
                ->join('trips', 'trips.id = bookings.trip_id', 'left')
                ->join('vendors', 'vendors.id = trips.vendor_id', 'left')
                ->join('routes', 'routes.id = trips.route_id', 'left')
                ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
                ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
                ->where('payments.payment_method !=', 'wallet');

            if ($status) {
                $builder->where('payments.status', $status);
            }
            if ($method) {
                $builder->where('payments.payment_method', $method);
            }
            if ($from) {
                $builder->where('payments.created_at >=', $from . ' 00:00:00');
            }
            if ($to) {
                $builder->where('payments.created_at <=', $to . ' 23:59:59');
            }

            foreach ($builder->get()->getResultArray() as $row) {
                $row['key'] = 'p' . $row['id'];
                $row['id']  = (int) $row['id'];
                $row['amount'] = (float) $row['amount'];
                $items[] = $row;
            }
        }

        // Newest first.
        usort($items, function (array $a, array $b) {
            $ta = strtotime($a['occurred_at'] ?? '1970-01-01 00:00:00');
            $tb = strtotime($b['occurred_at'] ?? '1970-01-01 00:00:00');
            if ($ta === $tb) {
                return (int) $b['id'] <=> (int) $a['id'];
            }
            return $tb <=> $ta;
        });

        $summary = ['total' => 0, 'total_in' => 0.0, 'total_out' => 0.0];
        foreach ($items as $row) {
            $summary['total']++;
            if ($row['type'] === 'debit') {
                $summary['total_out'] += $row['amount'];
            } else {
                $summary['total_in'] += $row['amount'];
            }
        }
        $summary['total_in']  = round($summary['total_in'], 2);
        $summary['total_out'] = round($summary['total_out'], 2);

        return api_success([
            'items'   => $items,
            'summary' => $summary,
        ]);
    }

    /**
     * GET /api/admin/settings
     */
    public function settings(): ResponseInterface
    {
        $rows = model(SettingModel::class)->orderBy('group', 'ASC')->orderBy('key', 'ASC')->findAll();
        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row['group']][$row['key']] = $row['is_json'] ? json_decode($row['value'], true) : $row['value'];
        }
        // Never return the live Paystack secret to the browser. The admin UI
        // treats an empty value on save as "keep the current secret".
        if (isset($grouped['payment']['paystack_secret_key'])) {
            $grouped['payment']['paystack_secret_key'] = '';
        }
        return api_success($grouped);
    }

    /**
     * PUT /api/admin/settings
     * Body: { group: 'general', settings: { key: value, ... } }
     */
    public function updateSettings(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'group'    => 'required|max_length[100]',
            'settings' => 'required',
        ]);

        $model = model(SettingModel::class);
        foreach ((array) $data['settings'] as $key => $value) {
            // The Paystack secret is write-only: a blank value on save leaves
            // the stored secret untouched instead of overwriting it.
            if ($key === 'paystack_secret_key' && ($value === '' || $value === null)) {
                continue;
            }
            $model->saveValue($key, $value, $data['group']);
        }

        return api_success(null, 'Settings saved.');
    }

    /**
     * Build a URL-safe slug, appending a numeric suffix if it collides.
     */
    private function uniqueSlug(string $table, string $slug, ?int $ignoreId = null): string
    {
        $db = \Config\Database::connect();
        $base = $slug ?: 'item';
        $candidate = $base;
        $i = 2;

        while (true) {
            $builder = $db->table($table)->where('slug', $candidate);
            if ($ignoreId !== null) {
                $builder->where('id !=', $ignoreId);
            }
            if ($builder->countAllResults() === 0) {
                return $candidate;
            }
            $candidate = $base . '-' . $i++;
        }
    }

    /**
     * Normalize a "columns" value (array or comma/space separated string)
     * into an array of distinct, uppercased single/double-letter labels.
     */
    private function normalizeColumns($value): array
    {
        if (is_string($value)) {
            $value = preg_split('/[\s,;]+/', trim($value)) ?: [];
        }
        $columns = [];
        foreach ((array) $value as $col) {
            $col = strtoupper(trim((string) $col));
            if ($col === '' || strlen($col) > 2) {
                continue;
            }
            $columns[$col] = true;
        }
        return array_keys($columns);
    }

    /**
     * Normalize a seat layout value into either an explicit multi-row grid
     * ({ "rows": [ [...] ] }) or a legacy flat columns list.
     *
     * Accepts a JSON string, an object with a "rows" key, or a flat array.
     */
    private function normalizeLayout($value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/[\s,;]+/', trim($value)) ?: [];
            }
        }

        if (is_array($value) && isset($value['rows']) && is_array($value['rows'])) {
            return ['rows' => $this->normalizeGrid($value['rows'])];
        }

        return $this->normalizeColumns($value);
    }

    /**
     * Normalize the explicit multi-row grid. Cells may be a seat label
     * (uppercased, max 2 chars), null for an aisle gap, or '' for an empty
     * slot. Trailing gaps are trimmed so stored grids stay compact.
     */
    private function normalizeGrid(array $rows): array
    {
        $grid = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $cells = [];
            foreach ($row as $cell) {
                if ($cell === null || $cell === '') {
                    $cells[] = $cell === null ? null : '';
                    continue;
                }
                $letter = strtoupper(trim((string) $cell));
                if ($letter === 'DRIVER') {
                    $cells[] = 'DRIVER';
                    continue;
                }
                if ($letter === '' || strlen($letter) > 2) {
                    $cells[] = '';
                    continue;
                }
                $cells[] = $letter;
            }
            while ($cells && ($cells[count($cells) - 1] === null || $cells[count($cells) - 1] === '')) {
                array_pop($cells);
            }
            if (count($cells) === 0) {
                continue;
            }
            $grid[] = $cells;
        }
        return $grid;
    }

    /**
     * Validate a normalized layout. Returns an error message or null when valid.
     */
    private function validateLayout(array $layout): ?string
    {
        if (isset($layout['rows'])) {
            $rows = $layout['rows'];
            if (count($rows) < 1 || count($rows) > 20) {
                return 'Seat layout must contain between 1 and 20 rows.';
            }
            $seatCount = 0;
            foreach ($rows as $rowCells) {
                if (count($rowCells) > 8) {
                    return 'Each row may contain at most 8 columns.';
                }
                foreach ($rowCells as $cell) {
                    if ($cell !== null && $cell !== '' && $cell !== 'DRIVER') {
                        $seatCount++;
                    }
                }
            }
            if ($seatCount < 1 || $seatCount > 200) {
                return 'Seat layout must contain between 1 and 200 seats.';
            }
            return null;
        }

        if (count($layout) < 1 || count($layout) > 8) {
            return 'Seat layout must contain between 1 and 8 columns.';
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Vendor withdrawals
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/withdrawals?status=pending|approved|rejected
     */
    public function withdrawals(): ResponseInterface
    {
        $status = $this->request->getGet('status');
        $statuses = ['pending', 'approved', 'rejected'];
        $status = in_array($status, $statuses, true) ? $status : null;

        return api_success(model(VendorWithdrawalModel::class)->withVendor($status));
    }

    /**
     * PUT /api/admin/withdrawals/(:num)/approve
     * Body: { note? }
     */
    public function approveWithdrawal(int $id): ResponseInterface
    {
        return $this->processWithdrawal($id, 'approved');
    }

    /**
     * PUT /api/admin/withdrawals/(:num)/reject
     * Body: { note? }
     */
    public function rejectWithdrawal(int $id): ResponseInterface
    {
        return $this->processWithdrawal($id, 'rejected');
    }

    /**
     * Approve or reject a pending withdrawal request.
     */
    private function processWithdrawal(int $id, string $status): ResponseInterface
    {
        $admin = $this->currentUser();

        $withdrawal = model(VendorWithdrawalModel::class)->find($id);
        if (! $withdrawal) {
            return api_error('Withdrawal not found.', 404);
        }
        if ($withdrawal['status'] !== 'pending') {
            return api_error('Only pending withdrawals can be processed.', 422);
        }

        $body = $this->request->getJSON(true) ?? [];
        $note = trim($body['note'] ?? '');

        model(VendorWithdrawalModel::class)->update($id, [
            'status'       => $status,
            'admin_id'     => (int) $admin['id'],
            'admin_note'   => $note !== '' ? $note : null,
            'processed_at' => date('Y-m-d H:i:s'),
        ]);

        return api_success(
            model(VendorWithdrawalModel::class)->find($id),
            $status === 'approved' ? 'Withdrawal approved.' : 'Withdrawal rejected.'
        );
    }

    // ------------------------------------------------------------------
    // Admin activity feed (real-time website activity for the bell)
    // ------------------------------------------------------------------

    /**
     * GET /api/admin/activities/recent
     * Latest website activity for the admin notification bell.
     */
    public function activities(): ResponseInterface
    {
        $limit = min(max((int) $this->request->getGet('limit'), 1), 50);
        $service = new \App\Services\AdminActivityService();
        return api_success([
            'items'    => $service->recent($limit),
            'unread'   => $service->unreadCount(),
        ]);
    }

    /**
     * GET /api/admin/activities/unread
     */
    public function activityUnread(): ResponseInterface
    {
        $service = new \App\Services\AdminActivityService();
        return api_success(['unread' => $service->unreadCount()]);
    }

    /**
     * POST /api/admin/activities/read-all
     * Marks every activity in the feed as read.
     */
    public function activityReadAll(): ResponseInterface
    {
        $service = new \App\Services\AdminActivityService();
        $service->markAllRead();
        return api_success(null, 'All notifications marked as read.');
    }
}

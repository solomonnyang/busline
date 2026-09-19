<?php

namespace App\Controllers\API\Vendor;

use App\Models\RoleModel;
use App\Models\StaffModel;
use App\Models\UserModel;
use App\Services\StaffPermissionService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * StaffController
 * Vendor team members. Only the vendor owner can manage staff.
 */
class StaffController extends BaseVendorController
{
    protected StaffModel $staff;
    protected UserModel  $users;

    public function __construct()
    {
        $this->staff = model(StaffModel::class);
        $this->users = model(UserModel::class);
    }

    /**
     * GET /api/vendor/staff
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        if (! $this->isOwner()) {
            return api_error('Only the vendor owner can view staff.', 403);
        }
        return api_success($this->staff->findByVendorId((int) $vendor['id']));
    }

    /**
     * GET /api/vendor/staff/permissions
     * Available permission codes for building the staff form.
     */
    public function permissions(): ResponseInterface
    {
        return api_success(StaffPermissionService::PERMISSIONS);
    }

    /**
     * POST /api/vendor/staff
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'        => 'required|min_length[2]|max_length[150]',
            'email'       => 'required|valid_email|is_unique[users.email]',
            'password'    => 'required|min_length[6]',
            'phone'       => 'permit_empty|max_length[30]',
            'role'        => 'required|in_list[manager,operator,accountant,support,driver,viewer]',
            'position'    => 'permit_empty|max_length[150]',
            'department'  => 'permit_empty|max_length[150]',
            'hire_date'   => 'permit_empty|valid_date',
            'base_salary' => 'permit_empty|decimal|greater_than_equal_to[0]',
            'salary_frequency' => 'permit_empty|in_list[monthly,weekly,daily]',
            'account_name'  => 'permit_empty|max_length[150]',
            'account_number' => 'permit_empty|max_length[30]',
            'bank_name'   => 'permit_empty|max_length[150]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            if (! $this->isOwner()) {
                return api_error('Only the vendor owner can manage staff.', 403);
            }

            $role = model(RoleModel::class)->findBySlug('vendor_staff');
            if (! $role) {
                return api_error('The staff role is not configured. Please run migrations.', 500);
            }

            $userId = $this->users->insert([
                'name'       => $data['name'],
                'email'      => strtolower($data['email']),
                'phone'      => $data['phone'] ?? null,
                'password'   => $data['password'],
                'role_id'    => (int) $role['id'],
                'is_active'  => 1,
            ]);

            $staffId = $this->staff->insert([
                'vendor_id'        => $vendor['id'],
                'user_id'          => $userId,
                'role'             => $data['role'],
                'permissions'      => json_encode(StaffPermissionService::forRole($data['role'])),
                'is_active'        => 1,
                'position'         => $data['position'] ?? null,
                'department'       => $data['department'] ?? null,
                'hire_date'        => $data['hire_date'] ?? null,
                'base_salary'      => isset($data['base_salary']) ? (float) $data['base_salary'] : null,
                'salary_frequency' => $data['salary_frequency'] ?? 'monthly',
                'account_name'     => $data['account_name'] ?? null,
                'account_number'   => $data['account_number'] ?? null,
                'bank_name'        => $data['bank_name'] ?? null,
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'staff.created', 'Staff', $staffId, ['name' => $data['name']]);

            return api_success($this->staff->find($staffId), 'Staff member added successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/staff/(:num)
     */
    public function update(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'role'        => 'permit_empty|in_list[manager,operator,accountant,support,driver,viewer]',
            'is_active'   => 'permit_empty|in_list[0,1]',
            'position'    => 'permit_empty|max_length[150]',
            'department'  => 'permit_empty|max_length[150]',
            'hire_date'   => 'permit_empty|valid_date',
            'base_salary' => 'permit_empty|decimal|greater_than_equal_to[0]',
            'salary_frequency' => 'permit_empty|in_list[monthly,weekly,daily]',
            'account_name'  => 'permit_empty|max_length[150]',
            'account_number' => 'permit_empty|max_length[30]',
            'bank_name'   => 'permit_empty|max_length[150]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            if (! $this->isOwner()) {
                return api_error('Only the vendor owner can manage staff.', 403);
            }

            $member = $this->staff->find($id);
            if (! $member || (int) $member['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Staff member not found.', 404);
            }

            $payload = [];
            if (! empty($data['role'])) {
                // Permissions always follow the role — never hand-assigned.
                $payload['role']        = $data['role'];
                $payload['permissions'] = json_encode(StaffPermissionService::forRole($data['role']));
            }
            if (isset($data['is_active'])) {
                $payload['is_active'] = (int) $data['is_active'];
            }
            foreach (['position', 'department', 'hire_date', 'salary_frequency', 'account_name', 'account_number', 'bank_name'] as $field) {
                if (array_key_exists($field, $data)) {
                    $payload[$field] = $data[$field];
                }
            }
            if (array_key_exists('base_salary', $data)) {
                $payload['base_salary'] = $data['base_salary'] !== null && $data['base_salary'] !== ''
                    ? (float) $data['base_salary']
                    : null;
            }

            if ($payload) {
                $this->staff->update($id, $payload);
            }

            // Keep the underlying user account in sync with the staff toggle.
            if (isset($payload['is_active'])) {
                $this->users->update((int) $member['user_id'], ['is_active' => (int) $data['is_active']]);
            }

            $this->audit()->vendorAction((int) $vendor['id'], 'staff.updated', 'Staff', $id);

            return api_success($this->staff->find($id), 'Staff member updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/staff/(:num)
     */
    public function delete(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            if (! $this->isOwner()) {
                return api_error('Only the vendor owner can manage staff.', 403);
            }

            $member = $this->staff->find($id);
            if (! $member || (int) $member['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Staff member not found.', 404);
            }

            $this->staff->delete($id);
            $this->users->update((int) $member['user_id'], ['is_active' => 0]);

            $this->audit()->vendorAction((int) $vendor['id'], 'staff.deleted', 'Staff', $id);

            return api_success(null, 'Staff member removed successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }
}

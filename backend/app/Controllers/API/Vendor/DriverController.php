<?php

namespace App\Controllers\API\Vendor;

use App\Models\DriverModel;
use App\Models\StaffModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * DriverController
 * Vendor fleet drivers CRUD + availability lookup.
 */
class DriverController extends BaseVendorController
{
    protected DriverModel $drivers;
    protected StaffModel  $staff;

    public function __construct()
    {
        $this->drivers = model(DriverModel::class);
        $this->staff   = model(StaffModel::class);
    }

    /**
     * GET /api/vendor/drivers
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        return api_success($this->drivers->findByVendorId((int) $vendor['id']));
    }

    /**
     * GET /api/vendor/drivers/available?date=YYYY-MM-DD
     * Active drivers without a trip assignment on the given date.
     */
    public function available(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $date = $this->request->getGet('date') ?? date('Y-m-d');
        return api_success($this->drivers->available((int) $vendor['id'], $date));
    }

    /**
     * GET /api/vendor/drivers/staff-options
     * Active staff members not already linked to a driver, usable to create a driver.
     */
    public function staffOptions(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        return api_success($this->staff->driverCandidates((int) $vendor['id']));
    }

    /**
     * POST /api/vendor/drivers
     * A driver can be created either manually (name/phone/email) or from an
     * existing staff member via staff_id, which pre-fills the contact details.
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'staff_id'        => 'permit_empty|is_natural_no_zero',
            'name'            => 'permit_empty|min_length[2]|max_length[150]',
            'phone'           => 'permit_empty|max_length[30]',
            'email'           => 'permit_empty|valid_email',
            'license_number'  => 'permit_empty|max_length[50]',
            'license_expiry'  => 'permit_empty|valid_date',
            'status'          => 'permit_empty|in_list[active,inactive,suspended]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('drivers.manage');

            $staffId = ! empty($data['staff_id']) ? (int) $data['staff_id'] : null;

            if (! $staffId && empty(trim((string) ($data['name'] ?? '')))) {
                return api_error('Driver name is required when not creating from staff.', 422);
            }

            $name    = $data['name'] ?? null;
            $phone   = $data['phone'] ?? null;
            $email   = ! empty($data['email']) ? strtolower($data['email']) : null;

            if ($staffId) {
                $member = $this->staff->find($staffId);
                if (! $member || (int) $member['vendor_id'] !== (int) $vendor['id'] || (int) $member['is_active'] !== 1) {
                    return api_error('The selected staff member is not available.', 422);
                }
                if ($this->drivers->findByStaffId($staffId)) {
                    return api_error('This staff member is already registered as a driver.', 422);
                }

                // Pre-fill contact details from the staff member's user account.
                $user = $this->staff->select('users.name, users.email, users.phone')
                    ->join('users', 'users.id = staff.user_id', 'left')
                    ->where('staff.id', $staffId)
                    ->first();
                $name  = $name ?: ($user['name'] ?? null);
                $email = $email ?: ($user['email'] ?? null);
                $phone = $phone ?: ($user['phone'] ?? null);
            }

            $id = $this->drivers->insert([
                'vendor_id'       => $vendor['id'],
                'staff_id'        => $staffId,
                'name'            => $name,
                'phone'           => $phone,
                'email'           => $email,
                'license_number'  => $data['license_number'] ?? null,
                'license_expiry'  => $data['license_expiry'] ?? null,
                'status'          => $data['status'] ?? 'active',
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'driver.created', 'Driver', $id, ['name' => $name ?? 'from staff']);
            return api_success($this->drivers->find($id), 'Driver added successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/drivers/(:num)
     */
    public function update(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'            => 'required|min_length[2]|max_length[150]',
            'phone'           => 'permit_empty|max_length[30]',
            'email'           => 'permit_empty|valid_email',
            'license_number'  => 'permit_empty|max_length[50]',
            'license_expiry'  => 'permit_empty|valid_date',
            'status'          => 'permit_empty|in_list[active,inactive,suspended]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $driver = $this->drivers->find($id);
            if (! $driver || (int) $driver['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Driver not found.', 404);
            }

            $this->requirePermission('drivers.manage');
            $this->drivers->update($id, [
                'name'            => $data['name'],
                'phone'           => $data['phone'] ?? null,
                'email'           => ! empty($data['email']) ? strtolower($data['email']) : null,
                'license_number'  => $data['license_number'] ?? null,
                'license_expiry'  => $data['license_expiry'] ?? null,
                'status'          => $data['status'] ?? $driver['status'],
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'driver.updated', 'Driver', $id);
            return api_success($this->drivers->find($id), 'Driver updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/drivers/(:num)
     */
    public function delete(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $driver = $this->drivers->find($id);
            if (! $driver || (int) $driver['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Driver not found.', 404);
            }

            $this->requirePermission('drivers.manage');

            // Release the staff linkage so the staff member can be re-added later.
            if (! empty($driver['staff_id'])) {
                $this->drivers->update($id, ['staff_id' => null]);
            }

            $this->drivers->delete($id);
            $this->audit()->vendorAction((int) $vendor['id'], 'driver.deleted', 'Driver', $id);

            return api_success(null, 'Driver removed successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }
}

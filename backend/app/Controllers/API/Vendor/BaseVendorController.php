<?php

namespace App\Controllers\API\Vendor;

use App\Controllers\API\BaseApiController;
use App\Models\StaffModel;
use App\Models\VendorModel;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\StaffPermissionService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * BaseVendorController
 * Shared resolution + RBAC helpers for all vendor dashboard controllers.
 * Supports the vendor owner (role: vendor) and staff members (role: vendor_staff)
 * whose access is scoped to the staff record's vendor.
 */
abstract class BaseVendorController extends BaseApiController
{
    /**
     * Resolve the acting vendor profile (owner or staff member) and attach it
     * to the request so services (e.g. AuditService) can pick up the scope.
     *
     * @throws \RuntimeException when no vendor is associated with the user
     */
    protected function vendor(): array
    {
        $user   = $this->currentUser();
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
     * Vendor profile, guaranteed to be approved before management actions.
     *
     * @throws \RuntimeException when the vendor is pending approval
     */
    protected function requireApprovedVendor(): array
    {
        $vendor = $this->vendor();
        if ($vendor['approval_status'] !== 'approved') {
            throw new \RuntimeException('Your vendor account is pending approval. This action is unavailable.');
        }
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

    protected function audit(): AuditService
    {
        return new AuditService();
    }

    protected function notifications(): NotificationService
    {
        return new NotificationService();
    }

    /**
     * Intercept every routed call: restrict to bus-booking vendors, resolve the
     * acting vendor (so endpoints can use $this->vendor() safely) and dispatch.
     */
    public function _remap(string $method, ...$params)
    {
        try {
            $vendor = $this->vendor();
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }

        if (($vendor['type'] ?? 'bus_booking') !== 'bus_booking') {
            return api_error('This area is only available to bus booking vendors.', 403);
        }

        if (! method_exists($this, $method)) {
            return api_error('Endpoint not found.', 404);
        }

        try {
            return $this->{$method}(...$params);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }
}

<?php

namespace App\Controllers\API;

use App\Models\CustomerModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * ProfileController
 * Update the authenticated user's account and profile details.
 */
class ProfileController extends BaseApiController
{
    /**
     * GET /api/profile
     * Current user with their role-specific profile.
     */
    public function show(): ResponseInterface
    {
        $user = $this->currentUser();
        $profile = null;
        $staff = null;

        if ($user['role_slug'] === 'vendor') {
            $profile = model(\App\Models\VendorModel::class)->findByUserId((int) $user['id']);
        } elseif ($user['role_slug'] === 'customer') {
            $profile = model(CustomerModel::class)->findByUserId((int) $user['id']);
        } elseif ($user['role_slug'] === 'vendor_staff') {
            $member = model(\App\Models\StaffModel::class)->findByUserId((int) $user['id']);
            if ($member) {
                $staff = [
                    'id'          => (int) $member['id'],
                    'vendor_id'   => (int) $member['vendor_id'],
                    'role'        => $member['role'],
                    'position'    => $member['position'] ?? null,
                    'department'  => $member['department'] ?? null,
                    'is_active'   => (int) $member['is_active'],
                    'permissions' => \App\Services\StaffPermissionService::forRole($member['role']),
                ];
            }
        }

        unset($user['password'], $user['remember_token']);

        return api_success([
            'user'    => $user,
            'profile' => $profile,
            'staff'   => $staff,
        ]);
    }

    /**
     * PUT /api/profile
     * Update name/phone/password/avatar and role-specific profile fields.
     */
    public function update(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'         => 'permit_empty|min_length[2]|max_length[150]',
            'phone'        => 'permit_empty|max_length[30]',
            'password'     => 'permit_empty|min_length[6]',
            'avatar'       => 'permit_empty|max_length[255]',
            'address'      => 'permit_empty|max_length[255]',
            'city'         => 'permit_empty|max_length[100]',
            'country'      => 'permit_empty|max_length[100]',
            'date_of_birth'=> 'permit_empty|valid_date',
            'gender'       => 'permit_empty|in_list[male,female,other]',
        ]);

        $user = $this->currentUser();
        $userModel = model(UserModel::class);

        $update = [
            'phone' => $data['phone'] ?? $user['phone'],
        ];
        if (! empty($data['name'])) {
            $update['name'] = $data['name'];
        }
        if (! empty($data['password'])) {
            $update['password'] = $data['password'];
        }
        if (array_key_exists('avatar', $data)) {
            $update['avatar'] = $data['avatar'] === '' ? null : $data['avatar'];
        }
        $userModel->update($user['id'], $update);

        if ($user['role_slug'] === 'customer') {
            $customer = model(CustomerModel::class)->findByUserId((int) $user['id']);
            if ($customer) {
                model(CustomerModel::class)->update($customer['id'], [
                    'address'       => $data['address'] ?? $customer['address'],
                    'city'          => $data['city'] ?? $customer['city'],
                    'country'       => $data['country'] ?? $customer['country'],
                    'date_of_birth' => $data['date_of_birth'] ?? $customer['date_of_birth'],
                    'gender'        => $data['gender'] ?? $customer['gender'],
                ]);
            }
        } elseif ($user['role_slug'] === 'vendor') {
            $vendor = model(\App\Models\VendorModel::class)->findByUserId((int) $user['id']);
            if ($vendor) {
                model(\App\Models\VendorModel::class)->update($vendor['id'], [
                    'company_phone' => $data['phone'] ?? $vendor['company_phone'],
                    'address'       => $data['address'] ?? $vendor['address'],
                    'city'          => $data['city'] ?? $vendor['city'],
                    'country'       => $data['country'] ?? $vendor['country'],
                ]);
            }
        }

        return api_success(null, 'Profile updated successfully.');
    }

    /**
     * DELETE /api/account
     * Self-service "delete my account". Instead of hard-deleting rows, the
     * account is deactivated (is_active = 0) so it is preserved for the admin
     * (shown as inactive) and the user can no longer sign in. All active
     * sessions are revoked server-side.
     */
    public function destroy(): ResponseInterface
    {
        $user = $this->currentUser();

        // Admin accounts manage accounts via the admin panel and cannot be
        // self-deleted through this endpoint.
        if (in_array($user['role_slug'], ['super_admin', 'admin'], true)) {
            return api_error('Admin accounts cannot be deleted from the app.', 422);
        }

        // Deactivate the account (soft-delete preserved for admin).
        model(UserModel::class)->update((int) $user['id'], ['is_active' => 0]);

        // Revoke every active session so the token stops working immediately.
        model(\App\Models\SessionModel::class)->revokeAllForUser((int) $user['id']);

        return api_success(null, 'Your account has been deactivated.');
    }
}

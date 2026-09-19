<?php

namespace App\Services;

use App\Models\CustomerModel;
use App\Models\EmailVerificationModel;
use App\Models\LoginHistoryModel;
use App\Models\PasswordResetModel;
use App\Models\RoleModel;
use App\Models\SessionModel;
use App\Models\StaffModel;
use App\Models\UserModel;
use App\Models\VendorModel;

/**
 * AuthService
 * Handles registration and login for vendors and customers.
 */
class AuthService
{
    protected UserModel          $users;
    protected RoleModel          $roles;
    protected VendorModel        $vendors;
    protected CustomerModel      $customers;
    protected StaffModel         $staff;
    protected PasswordResetModel $passwordResets;
    protected EmailVerificationModel $emailVerifications;
    protected SessionModel       $sessions;
    protected LoginHistoryModel  $loginHistory;
    protected LoyaltyService     $loyalty;

    public function __construct()
    {
        $this->users          = model(UserModel::class);
        $this->roles          = model(RoleModel::class);
        $this->vendors        = model(VendorModel::class);
        $this->customers      = model(CustomerModel::class);
        $this->staff          = model(StaffModel::class);
        $this->passwordResets = model(PasswordResetModel::class);
        $this->emailVerifications = model(EmailVerificationModel::class);
        $this->sessions       = model(SessionModel::class);
        $this->loginHistory   = model(LoginHistoryModel::class);
        $this->loyalty        = new LoyaltyService();
    }

    /**
     * Register a new vendor. Creates user + vendor profile (pending approval).
     *
     * @return array{user: array, vendor: array, token: string}
     */
    public function registerVendor(array $data): array
    {
        $role = $this->roles->findBySlug('vendor');

        $revivedId = $this->reviveDeletedUser(strtolower($data['email']), (int) $role['id'], $data);

        if ($revivedId !== null) {
            // A previously soft-deleted account owned this email: restore it.
            $user     = $revivedId;
            $vendorId = $this->ensureVendor($user, $data);
        } else {
            $user = $this->users->insert([
                'name'       => $data['name'],
                'email'      => strtolower($data['email']),
                'phone'      => $data['phone'] ?? null,
                'password'   => $data['password'],
                'role_id'    => $role['id'],
                'is_active'  => 1,
            ]);

            $vendorId = $this->vendors->insert([
                'user_id'         => $user,
                'type'            => $data['type'] ?? 'bus_booking',
                'company_name'    => $data['company_name'],
                'company_email'   => $data['company_email'] ?? $data['email'],
                'company_phone'   => $data['company_phone'] ?? $data['phone'] ?? null,
                'address'         => $data['address'] ?? null,
                'city'            => $data['city'] ?? null,
                'country'         => $data['country'] ?? null,
                'description'     => $data['description'] ?? null,
                'approval_status' => 'pending',
            ]);
        }

        $terminalIds = [];
        if (! empty($data['terminal_ids']) && is_array($data['terminal_ids'])) {
            foreach ($data['terminal_ids'] as $tid) {
                $tid = (int) $tid;
                if ($tid > 0) {
                    $terminalIds[] = $tid;
                }
            }
        }
        if (! empty($data['terminal_id'])) {
            $terminalIds[] = (int) $data['terminal_id'];
        }
        $terminalIds = array_values(array_unique($terminalIds));
        $this->vendors->syncTerminals($vendorId, $terminalIds);

        $userRow = $this->users->find($user);
        $userRow['role_slug'] = 'vendor';

        // Notify the vendor that their account is pending review.
        try {
            (new EmailService())->vendorPending($userRow, $this->vendors->find($vendorId));
        } catch (\Throwable $e) {
            // Email failures must never block registration.
        }

        $token = jwt_issue($userRow);
        $this->recordSession($userRow, $token);

        return [
            'user'   => $this->safeUser($userRow),
            'vendor' => $this->vendors->find($vendorId),
            'token'  => $token,
        ];
    }

    /**
     * Register a new customer.
     */
    public function registerCustomer(array $data): array
    {
        $role = $this->roles->findBySlug('customer');

        $revivedId = $this->reviveDeletedUser(strtolower($data['email']), (int) $role['id'], $data);

        if ($revivedId !== null) {
            // A previously soft-deleted account owned this email: restore it.
            $user = $revivedId;
            $this->ensureCustomer($user, $data);
        } else {
            $user = $this->users->insert([
                'name'       => $data['name'],
                'email'      => strtolower($data['email']),
                'phone'      => $data['phone'] ?? null,
                'password'   => $data['password'],
                'role_id'    => $role['id'],
                'is_active'  => 1,
            ]);

            $this->customers->insert([
                'user_id'       => $user,
                'address'       => $data['address'] ?? null,
                'city'          => $data['city'] ?? null,
                'country'       => $data['country'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender'        => $data['gender'] ?? null,
            ]);
        }

        // Issue the new customer's own referral code and attribute the signup
        // to a referrer when a code was provided in the registration payload.
        $referralCode = $this->loyalty->ensureReferralCode((int) $user);
        $ref = trim((string) ($data['referral_code'] ?? $data['ref'] ?? ''));
        if ($ref !== '') {
            $customer = $this->customers->findByUserId((int) $user);
            if ($customer) {
                $this->loyalty->attachReferral((int) $user, (int) $customer['id'], $ref);
            }
        }

        $userRow = $this->users->find($user);
        $userRow['role_slug'] = 'customer';
        $userRow['referral_code'] = $referralCode;

        // Welcome + verification emails (email failures must never block registration).
        try {
            (new EmailService())->welcome($userRow, ['referral_code' => $referralCode]);
        } catch (\Throwable $e) {
            // ignore
        }
        $verificationCode = $this->issueVerificationCode($userRow['email']);
        try {
            (new EmailService())->verification($userRow, $verificationCode);
        } catch (\Throwable $e) {
            // ignore
        }

        // No token is issued: the account is locked until the email is verified.
        return [
            'user'           => $this->safeUser($userRow),
            'customer'       => $this->customers->findByUserId($user),
            'referral_code'  => $referralCode,
            'email_verified' => false,
            'token'          => null,
        ];
    }

    /**
     * If a soft-deleted account already owns this email, restore it (clear
     * deleted_at, refresh identity fields) so the email can be re-registered.
     * Returns the restored user id, or null when no soft-deleted account exists.
     */
    protected function reviveDeletedUser(string $email, int $roleId, array $data): ?int
    {
        $existing = $this->users->withDeleted()
            ->where('email', $email)
            ->where('deleted_at IS NOT NULL')
            ->first();

        if (! $existing) {
            return null;
        }

        $userId = (int) $existing['id'];

        $this->users->protect(false)->update($userId, [
            'name'              => $data['name'],
            'phone'             => $data['phone'] ?? null,
            'password'          => $data['password'],
            'role_id'           => $roleId,
            'is_active'         => 1,
            'email_verified_at' => null,
            'deleted_at'        => null,
        ]);

        return $userId;
    }

    /**
     * Restore a soft-deleted customer profile for a re-registered email, or
     * create a fresh one when none exists.
     */
    protected function ensureCustomer(int $userId, array $data): void
    {
        $existing = $this->customers->withDeleted()->where('user_id', $userId)->first();

        if ($existing) {
            $this->customers->protect(false)->update((int) $existing['id'], [
                'user_id'    => $userId,
                'deleted_at' => null,
            ]);
            return;
        }

        $this->customers->insert([
            'user_id'       => $userId,
            'address'       => $data['address'] ?? null,
            'city'          => $data['city'] ?? null,
            'country'       => $data['country'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'gender'        => $data['gender'] ?? null,
        ]);
    }

    /**
     * Restore a soft-deleted vendor profile for a re-registered email (reset
     * to pending approval), or create a fresh one when none exists.
     * Returns the vendor profile id.
     */
    protected function ensureVendor(int $userId, array $data): int
    {
        $existing = $this->vendors->withDeleted()->where('user_id', $userId)->first();

        if ($existing) {
            $id = (int) $existing['id'];
            $this->vendors->protect(false)->update($id, [
                'user_id'         => $userId,
                'type'            => $data['type'] ?? $existing['type'] ?? 'bus_booking',
                'approval_status' => 'pending',
                'approved_by'     => null,
                'approved_at'     => null,
                'deleted_at'      => null,
            ]);
            return $id;
        }

        return (int) $this->vendors->insert([
            'user_id'         => $userId,
            'type'            => $data['type'] ?? 'bus_booking',
            'company_name'    => $data['company_name'],
            'company_email'   => $data['company_email'] ?? $data['email'],
            'company_phone'   => $data['company_phone'] ?? $data['phone'] ?? null,
            'address'         => $data['address'] ?? null,
            'city'            => $data['city'] ?? null,
            'country'         => $data['country'] ?? null,
            'description'     => $data['description'] ?? null,
            'approval_status' => 'pending',
        ]);
    }

    /**
     * Send a password reset email with a one-time, expiring token.
     * Returns true when a matching account was found (the caller decides
     * whether to reveal this to the requester).
     */
    public function forgotPassword(string $email): bool
    {
        $email = strtolower(trim($email));
        $user  = $this->users->findByEmail($email);

        if (! $user || (int) $user['is_active'] !== 1) {
            return false;
        }

        // Invalidate any previous reset tokens for this email, then create one.
        $this->passwordResets->deleteForEmail($email);
        $token = bin2hex(random_bytes(32));
        $this->passwordResets->insert([
            'email'      => $email,
            'token'      => hash('sha256', $token),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        (new EmailService())->passwordReset($user, $token);

        return true;
    }

    /**
     * Generate, store (hashed) and return a fresh 6-digit email verification code.
     */
    public function issueVerificationCode(string $email): string
    {
        $email = strtolower(trim($email));
        $code  = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $this->emailVerifications->deleteForEmail($email);
        $this->emailVerifications->insert([
            'email'      => $email,
            'code'       => hash('sha256', $code),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $code;
    }

    /**
     * Verify an email address using the emailed 6-digit code.
     *
     * @throws \RuntimeException when the code is invalid/expired or the account is missing
     */
    public function verifyEmail(string $email, string $code): void
    {
        $email = strtolower(trim($email));

        $row = $this->emailVerifications->findValid($email, hash('sha256', trim($code)));
        if (! $row) {
            throw new \RuntimeException('This verification code is invalid or has expired. Please request a new one.');
        }

        $user = $this->users->findByEmail($email);
        if (! $user) {
            throw new \RuntimeException('Account not found.');
        }

        if (empty($user['email_verified_at'])) {
            $this->users->update((int) $user['id'], ['email_verified_at' => date('Y-m-d H:i:s')]);
        }

        $this->emailVerifications->deleteForEmail($email);
    }

    /**
     * (Re)send a verification code. Returns true when a matching unverified
     * account was found so the caller can avoid probing registered emails.
     */
    public function resendVerification(string $email): bool
    {
        $email = strtolower(trim($email));
        $user  = $this->users->findByEmail($email);

        if (! $user || (int) $user['is_active'] !== 1 || ! empty($user['email_verified_at'])) {
            return false;
        }

        $code = $this->issueVerificationCode($email);
        (new EmailService())->verification($user, $code);

        return true;
    }

    /**
     * Validate a reset token and update the user's password.
     *
     * @throws \RuntimeException when the token is invalid/expired or the account is missing
     */
    public function resetPassword(string $email, string $token, string $password): void
    {
        $email = strtolower(trim($email));

        $row = $this->passwordResets->findValid($email, hash('sha256', trim($token)));
        if (! $row) {
            throw new \RuntimeException('This reset link is invalid or has expired. Please request a new one.');
        }

        $user = $this->users->findByEmail($email);
        if (! $user) {
            throw new \RuntimeException('Account not found.');
        }

        $this->users->update((int) $user['id'], ['password' => $password]);
        $this->passwordResets->deleteForEmail($email);
    }

    /**
     * Authenticate a user and return tokens.
     *
     * When the account has two-factor authentication enabled, no access token is
     * issued. Instead a short-lived challenge token is returned that must be
     * completed via AuthService::verifyTwoFactor().
     */
    public function login(string $email, string $password): ?array
    {
        $user = $this->users->where('email', strtolower($email))->first();

        if (! $user || ! password_verify($password, $user['password'])) {
            if ($user) {
                $this->recordLoginHistory($user, false);
            }
            return null;
        }

        if ((int) $user['is_active'] !== 1) {
            throw new \RuntimeException('Your account has been deactivated. Contact support.');
        }

        if (empty($user['email_verified_at'])) {
            $role = $this->roles->find((int) $user['role_id']);
            if (($role['slug'] ?? '') === 'customer') {
                return [
                    'requires_verification' => true,
                    'email'                 => $user['email'],
                    'user'                  => $this->safeUser($user),
                ];
            }
        }

        $userRow = $this->users->getUserWithProfile((int) $user['id']);

        if ((int) $user['two_factor_enabled'] === 1) {
            return [
                'requires_2fa' => true,
                'tfa_token'    => jwt_issue($userRow, '2fa', 300),
                'user'         => $this->safeUser($userRow),
            ];
        }

        return $this->buildSession($userRow);
    }

    /**
     * Complete a two-factor login: verify the TOTP (or backup) code against the
     * user bound to a valid challenge token and issue the real access token.
     *
     * @return array{user: array, profile: array|null, token: string}
     */
    public function verifyTwoFactor(string $tfaToken, string $code): array
    {
        $payload = jwt_validate($tfaToken);
        if (! $payload || ($payload['type'] ?? '') !== '2fa' || empty($payload['sub'])) {
            throw new \RuntimeException('Your 2FA session expired. Please log in again.');
        }

        $user = $this->users->getUserWithProfile((int) $payload['sub']);
        if (! $user || (int) $user['is_active'] !== 1) {
            throw new \RuntimeException('Account not found or deactivated.');
        }

        $totp = new TotpService();
        $backupHashes = $this->decodeBackupCodes($user['two_factor_backup_codes'] ?? null);

        if (! $totp->verify((string) $user['two_factor_secret'], $code)) {
            $remaining = $backupHashes === null ? null : $totp->consumeBackupCode($backupHashes, $code);
            if ($remaining === null) {
                throw new \RuntimeException('Invalid verification code.');
            }
            $this->users->update((int) $user['id'], [
                'two_factor_backup_codes' => json_encode($remaining),
            ]);
        }

        return $this->buildSession($user);
    }

    /**
     * Build a full authenticated session for a user row.
     */
    protected function buildSession(array $userRow): array
    {
        return $this->openSession($userRow, true);
    }

    /**
     * Open a server-side session for a user row and issue an access token.
     * Public so non-login flows (e.g. admin impersonation) can mint a fully
     * valid session that the AuthFilter will accept.
     *
     * @return array{user: array, profile: array|null, token: string}
     */
    public function openSession(array $userRow, bool $recordLogin = true): array
    {
        $profile = null;
        $staff   = null;
        if ($userRow['role_slug'] === 'vendor') {
            $profile = $this->vendors->findByUserId((int) $userRow['id']);
        } elseif ($userRow['role_slug'] === 'customer') {
            $profile = $this->customers->findByUserId((int) $userRow['id']);
        } elseif ($userRow['role_slug'] === 'vendor_staff') {
            $staff = $this->staff->findByUserId((int) $userRow['id']);
        }

        $token = jwt_issue($userRow);
        $this->recordSession($userRow, $token);
        if ($recordLogin) {
            $this->recordLoginHistory($userRow, true);
        }

        return [
            'user'    => $this->safeUser($userRow),
            'profile' => $profile,
            'staff'   => $staff ? $this->safeStaff($staff) : null,
            'token'   => $token,
        ];
    }

    /**
     * A compact staff record for the frontend so the dashboard menu can reflect
     * the permissions granted by the staff member's role.
     */
    protected function safeStaff(array $staff): array
    {
        return [
            'id'          => (int) $staff['id'],
            'vendor_id'   => (int) $staff['vendor_id'],
            'role'        => $staff['role'],
            'position'    => $staff['position'] ?? null,
            'department'  => $staff['department'] ?? null,
            'is_active'   => (int) $staff['is_active'],
            'permissions' => StaffPermissionService::forRole($staff['role']),
        ];
    }

    /**
     * Record an active JWT session for a freshly issued access token.
     */
    protected function recordSession(array $userRow, string $token): void
    {
        $request = service('request');
        $ua      = (string) $request->getUserAgent();

        $this->sessions->insert([
            'user_id'     => (int) $userRow['id'],
            'token_hash'  => hash('sha256', $token),
            'device'      => $this->deviceFromUa($ua),
            'ip_address'  => $request->getIPAddress(),
            'user_agent'  => substr($ua, 0, 255),
            'expires_at'  => date('Y-m-d H:i:s', time() + (int) env('jwt.ttl', 86400)),
            'is_active'   => 1,
        ]);
    }

    /**
     * Record a login attempt (success or failure) in login_history.
     */
    protected function recordLoginHistory(array $userRow, bool $success): void
    {
        $request = service('request');
        $ua      = (string) $request->getUserAgent();

        $this->loginHistory->record([
            'user_id'    => (int) $userRow['id'],
            'ip_address' => $request->getIPAddress(),
            'user_agent' => substr($ua, 0, 255),
            'device'     => $this->deviceFromUa($ua),
            'is_success' => $success ? 1 : 0,
        ]);
    }

    /**
     * Best-effort device label derived from the user agent string.
     */
    protected function deviceFromUa(string $ua): string
    {
        if (stripos($ua, 'Android') !== false) {
            return 'Android';
        }
        if (stripos($ua, 'iPhone') !== false || stripos($ua, 'iPad') !== false) {
            return 'iOS';
        }
        if (stripos($ua, 'Windows') !== false) {
            return 'Windows';
        }
        if (stripos($ua, 'Macintosh') !== false || stripos($ua, 'Mac OS') !== false) {
            return 'macOS';
        }
        if (stripos($ua, 'Linux') !== false) {
            return 'Linux';
        }
        return 'Unknown';
    }

    /**
     * Decode stored backup-code hashes.
     *
     * @return string[]|null
     */
    protected function decodeBackupCodes(?string $json): ?array
    {
        if (empty($json)) {
            return null;
        }
        $codes = json_decode($json, true);
        return is_array($codes) ? $codes : null;
    }

    /**
     * Strip sensitive fields before returning to the client.
     */
    public function safeUser(array $user): array
    {
        unset($user['password'], $user['remember_token'], $user['two_factor_secret'], $user['two_factor_backup_codes']);
        return $user;
    }
}

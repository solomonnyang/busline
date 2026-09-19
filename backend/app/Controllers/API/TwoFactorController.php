<?php

namespace App\Controllers\API;

use App\Models\UserModel;
use App\Services\QRCodeService;
use App\Services\TotpService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * TwoFactorController
 * Manage TOTP (Google Authenticator) two-factor authentication for the
 * authenticated user: status, setup, enable, disable and backup codes.
 */
class TwoFactorController extends BaseApiController
{
    protected TotpService $totp;

    public function __construct()
    {
        $this->totp = new TotpService();
    }

    /**
     * GET /api/2fa
     * Current 2FA status (never leaks the secret).
     */
    public function status(): ResponseInterface
    {
        $user = $this->currentUser();

        return api_success([
            'enabled'          => (bool) ((int) $user['two_factor_enabled'] === 1),
            'backup_codes_left' => $this->countBackupCodes($user),
        ]);
    }

    /**
     * POST /api/2fa/setup
     * Generate a new secret + QR code. Safe to call repeatedly while disabled.
     */
    public function setup(): ResponseInterface
    {
        $user = $this->currentUser();

        if ((int) $user['two_factor_enabled'] === 1) {
            return api_error('Two-factor authentication is already enabled.', 409);
        }

        $secret = $user['two_factor_secret'] ?: $this->totp->generateSecret();
        if (empty($user['two_factor_secret'])) {
            model(UserModel::class)->update((int) $user['id'], [
                'two_factor_secret' => $secret,
            ]);
        }

        $uri = $this->totp->generateUri($secret, $user['email']);
        $qr  = (new QRCodeService())->toDataUri($uri);

        return api_success([
            'secret'      => $secret,
            'otpauth_url' => $uri,
            'qr_data_uri' => $qr,
        ]);
    }

    /**
     * POST /api/2fa/enable
     * Verify a fresh code from the authenticator app and turn 2FA on.
     */
    public function enable(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'code'     => 'required|exact_length[6]|numeric',
            'password' => 'required',
        ]);

        $user = $this->currentUser();

        if ((int) $user['two_factor_enabled'] === 1) {
            return api_error('Two-factor authentication is already enabled.', 409);
        }

        if (! password_verify($data['password'], $user['password'])) {
            return api_error('Incorrect password.', 403);
        }

        if (empty($user['two_factor_secret'])) {
            return api_error('Run setup first to generate a QR code.', 400);
        }

        if (! $this->totp->verify($user['two_factor_secret'], $data['code'])) {
            return api_error('Invalid verification code. Check the time on your device.', 400);
        }

        $backupCodes = $this->totp->generateBackupCodes();

        model(UserModel::class)->update((int) $user['id'], [
            'two_factor_enabled'      => 1,
            'two_factor_backup_codes' => json_encode($backupCodes['hashes']),
        ]);

        return api_success([
            'enabled'     => true,
            'backup_codes' => $backupCodes['plain'],
        ], 'Two-factor authentication enabled.', 201);
    }

    /**
     * POST /api/2fa/disable
     * Confirm with a current code and password, then turn 2FA off.
     */
    public function disable(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'code'     => 'required|exact_length[6]|numeric',
            'password' => 'required',
        ]);

        $user = $this->currentUser();

        if ((int) $user['two_factor_enabled'] !== 1) {
            return api_error('Two-factor authentication is not enabled.', 409);
        }

        if (! password_verify($data['password'], $user['password'])) {
            return api_error('Incorrect password.', 403);
        }

        if (! $this->totp->verify($user['two_factor_secret'], $data['code'])) {
            return api_error('Invalid verification code.', 400);
        }

        model(UserModel::class)->update((int) $user['id'], [
            'two_factor_enabled'      => 0,
            'two_factor_secret'       => null,
            'two_factor_backup_codes' => null,
        ]);

        return api_success(['enabled' => false], 'Two-factor authentication disabled.');
    }

    /**
     * POST /api/2fa/backup-codes
     * Rotate backup codes (old ones are invalidated immediately).
     */
    public function backupCodes(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'password' => 'required',
        ]);

        $user = $this->currentUser();

        if (! password_verify($data['password'], $user['password'])) {
            return api_error('Incorrect password.', 403);
        }

        $backupCodes = $this->totp->generateBackupCodes();

        model(UserModel::class)->update((int) $user['id'], [
            'two_factor_backup_codes' => json_encode($backupCodes['hashes']),
        ]);

        return api_success([
            'backup_codes' => $backupCodes['plain'],
        ], 'New backup codes generated. Store them somewhere safe.');
    }

    /**
     * Count the current user's remaining backup codes.
     */
    protected function countBackupCodes(array $user): int
    {
        $codes = json_decode((string) ($user['two_factor_backup_codes'] ?? '[]'), true);
        return is_array($codes) ? count($codes) : 0;
    }
}

<?php

namespace App\Controllers\API;

use App\Services\AuthService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * AuthController
 * Public endpoints: register (vendor/customer), login, logout.
 */
class AuthController extends BaseApiController
{
    protected AuthService $auth;

    public function __construct()
    {
        $this->auth = new AuthService();
    }

    /**
     * POST /api/register/customer
     */
    public function registerCustomer(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'          => 'required|min_length[2]|max_length[150]',
            'email'         => 'required|valid_email|unique_active_email[users.email]',
            'password'      => 'required|min_length[6]',
            'phone'         => 'permit_empty|max_length[30]',
            'referral_code' => 'permit_empty|max_length[50]',
        ]);

        try {
            $result = $this->auth->registerCustomer($data);
            $user = $result['user'] ?? [];
            (new \App\Services\AdminActivityService())->record(
                'registration',
                'New customer registration',
                "{$user['name']} ({$user['email']}) just signed up on the website.",
                ['type' => 'customer', 'email' => $user['email'] ?? null]
            );
            return api_success($result, 'Registration successful. Welcome!', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/register/vendor
     */
    public function registerVendor(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'name'          => 'required|min_length[2]|max_length[150]',
            'email'         => 'required|valid_email|unique_active_email[users.email]',
            'password'      => 'required|min_length[6]',
            'company_name'  => 'required|min_length[2]|max_length[150]',
            'type'          => 'permit_empty|in_list[bus_booking]',
            'phone'         => 'permit_empty|max_length[30]',
            'company_phone' => 'permit_empty|max_length[30]',
            'terminal_id'   => 'permit_empty|is_natural_no_zero',
            'terminal_ids'  => 'permit_empty',
            'address'       => 'permit_empty|max_length[255]',
            'city'          => 'permit_empty|max_length[100]',
            'country'       => 'permit_empty|max_length[100]',
            'description'   => 'permit_empty',
        ]);

        try {
            $result = $this->auth->registerVendor($data);
            $user = $result['user'] ?? [];
            $vendor = $result['vendor'] ?? [];
            (new \App\Services\AdminActivityService())->record(
                'registration',
                'New vendor application',
                "{$vendor['company_name']} applied to become a vendor ({$user['name']}).",
                ['type' => 'vendor', 'email' => $user['email'] ?? null]
            );
            return api_success($result, 'Registration successful. Your account is pending admin approval.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/login
     */
    public function login(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'email'    => 'required|valid_email',
            'password' => 'required',
        ]);

        try {
            $result = $this->auth->login($data['email'], $data['password']);
            if (! $result) {
                return api_error('Invalid email or password.', 401);
            }
            if (isset($result['requires_verification'])) {
                return api_success($result, 'Please verify your email address before signing in.');
            }
            return api_success($result, $result['requires_2fa'] ?? false ? 'Enter your verification code.' : 'Login successful.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * POST /api/login/2fa
     * Complete a two-factor login using the challenge token from /api/login.
     */
    public function loginTwoFactor(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'tfa_token' => 'required',
            'code'      => 'required',
        ]);

        try {
            $result = $this->auth->verifyTwoFactor($data['tfa_token'], $data['code']);
            return api_success($result, 'Login successful.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }
    }
    /**
     * POST /api/password/forgot
     * Send a password reset link to the given email. Always responds the
     * same way so the endpoint cannot be used to probe registered emails.
     */
    public function forgotPassword(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'email' => 'required|valid_email',
        ]);

        $this->auth->forgotPassword($data['email']);

        return api_success(null, 'If that email exists, a password reset link has been sent.');
    }

    /**
     * POST /api/password/reset
     * Complete a password reset with the emailed token.
     * Body: { email, token, password }
     */
    public function resetPassword(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'email'    => 'required|valid_email',
            'token'    => 'required',
            'password' => 'required|min_length[6]',
        ]);

        try {
            $this->auth->resetPassword($data['email'], $data['token'], $data['password']);
            return api_success(null, 'Your password has been updated. You can now sign in.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/email/verify
     * Complete email verification with the emailed 6-digit code.
     * Body: { email, code }
     */
    public function verifyEmail(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'email' => 'required|valid_email',
            'code'  => 'required|exact_length[6]|numeric',
        ]);

        try {
            $this->auth->verifyEmail($data['email'], $data['code']);
            return api_success(null, 'Your email has been verified. You can now sign in.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 400);
        }
    }

    /**
     * POST /api/email/resend
     * (Re)send a verification code. Always responds the same way so the
     * endpoint cannot be used to probe registered emails.
     */
    public function resendVerification(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'email' => 'required|valid_email',
        ]);

        $this->auth->resendVerification($data['email']);

        return api_success(null, 'If that email exists and is unverified, a new code has been sent.');
    }

    /**
     * POST /api/logout
     * Revokes the current JWT session server-side so the token can no longer
     * pass the AuthFilter, then the client discards it.
     */
    public function logout(): ResponseInterface
    {
        $header = $this->request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            $session = model(\App\Models\SessionModel::class)->findByHash(hash('sha256', trim($matches[1])));
            if ($session) {
                model(\App\Models\SessionModel::class)->update((int) $session['id'], ['is_active' => 0]);
            }
        }

        return api_success(null, 'Logged out successfully.');
    }
}

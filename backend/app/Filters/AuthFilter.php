<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * AuthFilter
 * Validates the Bearer JWT on protected routes and attaches the
 * authenticated user (with role + vendor/customer profile) to the request.
 */
class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');

        if (! preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return api_error('Unauthorized. Bearer token required.', 401);
        }

        $token = trim($matches[1]);

        $payload = jwt_validate($token);
        if (! $payload || empty($payload['sub'])) {
            return api_error('Invalid or expired token.', 401);
        }

        // Challenge tokens (type !== 'access') must never unlock protected routes.
        if (($payload['type'] ?? '') !== 'access') {
            return api_error('Invalid or expired token.', 401);
        }

        // Session revocation check: the token must belong to a live, unexpired
        // session (created at login, revoked on logout / "log out everywhere").
        $session = model(\App\Models\SessionModel::class)->findByHash(hash('sha256', $token));
        if (! $session || (int) $session['is_active'] !== 1) {
            return api_error('Invalid or expired token.', 401);
        }
        if (strtotime($session['expires_at']) < time()) {
            model(\App\Models\SessionModel::class)->update((int) $session['id'], ['is_active' => 0]);
            return api_error('Invalid or expired token.', 401);
        }

        $user = model(\App\Models\UserModel::class)->getUserWithProfile((int) $payload['sub']);
        if (! $user) {
            return api_error('User not found.', 401);
        }

        if ((int) $user['is_active'] !== 1) {
            return api_error('Your account has been deactivated.', 403);
        }

        $request->user = $user;

        // Touch the session so the security view can show recent activity.
        model(\App\Models\SessionModel::class)->update((int) $session['id'], [
            'last_activity_at' => date('Y-m-d H:i:s'),
        ]);

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}

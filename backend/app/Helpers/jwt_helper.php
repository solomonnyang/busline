<?php

use CodeIgniter\HTTP\ResponseInterface;

/**
 * JWT Helper
 * Thin wrappers around firebase/php-jwt for issuing and validating tokens.
 */

if (! function_exists('jwt_secret')) {
    function jwt_secret(): string
    {
        $secret = env('jwt.secret', '');
        if (empty($secret)) {
            $secret = getenv('jwt.secret') ?: 'default-insecure-secret-change-me';
        }
        return $secret;
    }
}

if (! function_exists('jwt_issue')) {
    /**
     * Issue a signed JWT for a user.
     *
     * @param string $type 'access' for full session tokens, '2fa' for short-lived
     *                     challenge tokens that still need a TOTP verification step.
     * @param int|null $ttl Lifetime in seconds (defaults to jwt.ttl).
     */
    function jwt_issue(array $user, string $type = 'access', ?int $ttl = null): string
    {
        $now  = time();
        $ttl  = $ttl ?? (int) env('jwt.ttl', 86400);
        $payload = [
            'iss'   => base_url(),
            'iat'   => $now,
            'nbf'   => $now,
            'exp'   => $now + $ttl,
            'type'  => $type,
            'sub'   => (int) $user['id'],
            'email' => $user['email'],
            'role'  => $user['role_slug'] ?? ($user['role'] ?? ''),
        ];
        return \Firebase\JWT\JWT::encode($payload, jwt_secret(), 'HS256');
    }
}

if (! function_exists('jwt_validate')) {
    /**
     * Validate a token and return the decoded payload or null.
     */
    function jwt_validate(string $token)
    {
        try {
            return (array) \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(jwt_secret(), 'HS256'));
        } catch (\Throwable $e) {
            return null;
        }
    }
}

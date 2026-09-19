<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * RateLimitFilter
 * Applies per-client request throttling to the API. Tracks hits in a fixed
 * window using the configured CodeIgniter cache driver (file by default) and
 * returns HTTP 429 when a client exceeds the allowed number of requests.
 *
 * Covered for both the web frontend and the mobile app since both talk to the
 * same /api backend. Limits are configurable via environment variables:
 *   - RATE_LIMIT_MAX     (default 120) max requests per window
 *   - RATE_LIMIT_WINDOW  (default 60)  window length in seconds
 */
class RateLimitFilter implements FilterInterface
{
    /**
     * Enforce the per-client limit before the request is handled.
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        // Skip CORS preflight requests so they are never rate limited.
        if ($request->getMethod(true) === 'OPTIONS') {
            return null;
        }

        // Route-specific overrides may be passed as "max@window", e.g.
        // ['before' => '5@60'] means 5 requests per 60 seconds on that route.
        $routeScope = '';
        if (! empty($arguments)) {
            $limit = is_array($arguments) ? implode(',', $arguments) : (string) $arguments;
            if (strpos($limit, '@') !== false) {
                [$routeMax, $routeWindow] = array_map('intval', explode('@', $limit, 2));
                $max    = $routeMax > 0 ? $routeMax : 120;
                $window = $routeWindow > 0 ? $routeWindow : 60;
                $routeScope = 'r:' . md5($limit) . ':';
            }
        }

        if (! isset($max)) {
            $max = (int) getenv('RATE_LIMIT_MAX') ?: 120;
        }
        if (! isset($window)) {
            $window = (int) getenv('RATE_LIMIT_WINDOW') ?: 60;
        }

        $identifier = $this->clientIdentifier($request);
        $cache      = service('cache');

        // Cache keys may only contain [A-Za-z0-9_.-] plus a few safe chars,
        // so avoid the raw IP/colon prefix which contains reserved characters.
        $base   = md5($routeScope . $identifier);
        $key    = 'ratelimit_' . $base;
        $endKey = 'ratelimit_' . $base . '_end';

        $now         = time();
        $windowEndAt = (int) $cache->get($endKey);

        // A fresh window starts when the previous one has expired.
        if ($windowEndAt === 0 || $now >= $windowEndAt) {
            $cache->save($endKey, $now + $window, $window);
            $cache->save($key, 1, $window);
            return null;
        }

        $current = (int) $cache->get($key);

        if ($current >= $max) {
            // Over the limit for this window.
            $retryAfter = max(1, $windowEndAt - $now);
            $response   = service('response');
            $response->setStatusCode(429, 'Too Many Requests');
            $response->setHeader('Retry-After', (string) $retryAfter);
            return $response->setJSON([
                'success'     => false,
                'message'     => 'Too many requests. Please slow down and try again later.',
                'retry_after' => $retryAfter,
            ]);
        }

        $cache->save($key, $current + 1, $window);
        return null;
    }

    /**
     * Identify a client by authenticated user id when available, otherwise by
     * IP address. This scopes limits per user across the web + mobile clients.
     */
    private function clientIdentifier(RequestInterface $request): string
    {
        if (! empty($request->user) && isset($request->user['id'])) {
            return 'user:' . (int) $request->user['id'];
        }

        return 'ip:' . ($request->getIPAddress() ?: 'unknown');
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
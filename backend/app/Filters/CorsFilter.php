<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * CorsFilter
 * Sets permissive CORS headers for the frontend SPA and handles
 * OPTIONS preflight requests.
 */
class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $origin  = $request->getHeaderLine('Origin');
        $allowed = env('cors.allowedOrigins', 'http://localhost:5173');

        if ($origin && (strpos($allowed, $origin) !== false || $allowed === '*')) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            header('Access-Control-Allow-Origin: *');
        }
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, Accept, Origin');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 3600');

        if ($request->getMethod(true) === 'OPTIONS') {
            $response = service('response');
            return $response->setStatusCode(204);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}

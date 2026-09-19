<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * RoleFilter
 * Role-based access control. Requires `$user` to have one of the
 * supplied role slugs, e.g. before('vendor').
 */
class RoleFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $user = $request->user ?? null;

        if (! $user) {
            return api_error('Authentication required.', 401);
        }

        $roles = is_array($arguments) ? $arguments : (array) $arguments;
        $slug  = $user['role_slug'] ?? '';

        if (! empty($roles) && ! in_array($slug, $roles, true)) {
            return api_error('You do not have permission to access this resource.', 403);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}

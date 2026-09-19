<?php

namespace App\Services;

/**
 * StaffPermissionService
 * The single source of truth for staff dashboard access. Permissions are
 * derived from the staff role only — the vendor owner never assigns them.
 */
class StaffPermissionService
{
    /**
     * Every permission code the dashboard understands.
     */
    public const PERMISSIONS = [
        'bookings.manage',
        'trips.manage',
        'buses.manage',
        'routes.manage',
        'drivers.manage',
        'finance.manage',
        'hr.manage',
        'promos.manage',
        'reviews.reply',
        'analytics.view',
    ];

    /**
     * Permissions granted to each staff role.
     */
    public const BY_ROLE = [
        'manager'    => self::PERMISSIONS,
        'operator'   => [
            'bookings.manage',
            'trips.manage',
            'buses.manage',
            'routes.manage',
            'drivers.manage',
            'reviews.reply',
            'analytics.view',
        ],
        'accountant' => [
            'bookings.manage',
            'finance.manage',
            'analytics.view',
        ],
        'support'    => [
            'bookings.manage',
            'reviews.reply',
            'analytics.view',
        ],
        'driver'     => [],
        'viewer'     => [
            'analytics.view',
        ],
    ];

    /**
     * The effective permissions for a staff role. Unknown roles get nothing.
     */
    public static function forRole(string $role): array
    {
        return self::BY_ROLE[$role] ?? [];
    }
}

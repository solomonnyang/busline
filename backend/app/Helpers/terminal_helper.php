<?php

/**
 * Terminal Helper
 * Amenities normalization shared between the public terminal endpoints and
 * the admin terminal CRUD so both consumers get consistent shapes.
 *
 * Storage format is a JSON list of human-readable labels, e.g.
 *   ["Parking", "Restrooms", "Wi-Fi"]
 * but legacy seeded rows store a slug => bool map, e.g.
 *   {"parking": true, "restroom": true, ...}
 * This helper tolerates both and always returns:
 *   amenities_list  - list of label strings
 *   amenities_map   - slug => bool map
 */

if (! defined('TERMINAL_AMENITIES')) {
    define('TERMINAL_AMENITIES', [
        'parking'        => 'Parking',
        'restroom'       => 'Restroom',
        'waiting_lounge' => 'Waiting lounge',
        'wifi'           => 'Wi-Fi',
        'refreshments'   => 'Refreshments',
        'security'       => 'Security',
    ]);
}

if (! function_exists('terminal_amenities')) {
    /**
     * Normalize a stored amenities JSON string into list + map shapes.
     */
    function terminal_amenities(?string $raw): array
    {
        $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        $decoded = is_array($decoded) ? $decoded : [];

        $labels = [];
        $map    = array_fill_keys(array_keys(TERMINAL_AMENITIES), false);

        if (array_is_list($decoded)) {
            // List-of-labels format (new style / admin-created).
            foreach ($decoded as $label) {
                $label = trim((string) $label);
                if ($label === '') {
                    continue;
                }
                $labels[] = $label;
                $slug     = array_search($label, TERMINAL_AMENITIES, true);
                if ($slug !== false) {
                    $map[$slug] = true;
                }
            }
        } else {
            // Slug => bool format (legacy seeded data).
            foreach (TERMINAL_AMENITIES as $slug => $label) {
                if (! empty($decoded[$slug])) {
                    $map[$slug] = true;
                    $labels[]   = $label;
                }
            }
        }

        return ['amenities_list' => $labels, 'amenities_map' => $map];
    }
}

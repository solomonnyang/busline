<?php

/**
 * Router script for PHP's built-in development server.
 *
 * Serves existing static files from the public docroot directly and hands
 * all other requests to CodeIgniter's front controller (public/index.php).
 *
 * Usage:
 *   php -S 0.0.0.0:8090 -t public router.php
 */

$docroot = __DIR__ . '/public';

if (PHP_SAPI === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Map the request path to a real file under the public docroot.
    $file = $docroot . $path;

    if (is_file($file)) {
        // Let index.php handle PHP files; serve everything else directly.
        if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) !== 'php') {
            return false;
        }

        // For PHP files requested directly on the dev server, delegate to CI.
        require $file;
        return true;
    }

    // Not a static file: forward to CodeIgniter's front controller.
    require $docroot . '/index.php';
    return true;
}

require $docroot . '/index.php';

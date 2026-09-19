<?php

use CodeIgniter\HTTP\ResponseInterface;

/**
 * API Helper
 * Standardized JSON responses shared across all controllers.
 */

if (! function_exists('api_response')) {
    /**
     * Build a consistent JSON envelope.
     */
    function api_response(bool $success, $data = null, string $message = '', int $status = 200, array $extra = []): ResponseInterface
    {
        $response = service('response');
        $body = [
            'success' => $success,
            'message' => $message,
        ];
        if ($data !== null) {
            $body['data'] = $data;
        }
        $body = array_merge($body, $extra);
        return $response->setStatusCode($status)->setJSON($body);
    }
}

if (! function_exists('api_success')) {
    function api_success($data = null, string $message = 'Success', int $status = 200, array $extra = []): ResponseInterface
    {
        return api_response(true, $data, $message, $status, $extra);
    }
}

if (! function_exists('api_error')) {
    function api_error(string $message = 'Error', int $status = 400, $data = null, array $extra = []): ResponseInterface
    {
        return api_response(false, $data, $message, $status, $extra);
    }
}

if (! function_exists('api_validation_errors')) {
    /**
     * Flatten validation error lists into a single readable string + map.
     */
    function api_validation_errors(array $errors): ResponseInterface
    {
        $flattened = [];
        foreach ($errors as $field => $messages) {
            $flattened[$field] = is_array($messages) ? implode(' ', $messages) : $messages;
        }
        return api_error('Validation failed', 422, $flattened);
    }
}

if (! function_exists('settings')) {
    /**
     * Quick access to a setting value.
     */
    function settings(string $key, ?string $group = 'general')
    {
        return model(\App\Models\SettingModel::class)->getValue($key, $group);
    }
}

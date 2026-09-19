<?php

namespace App\Validation;

use CodeIgniter\Validation\Validation;

/**
 * Custom validation rules used across the application.
 */
class AppRules
{
    /**
     * Validate that an email is unique in the users table, ignoring
     * soft-deleted rows so a removed account's email can be re-registered.
     * Accepts a table.field param like is_unique, e.g. unique_active_email[users.email].
     */
    public function unique_active_email(?string $email = null, ?string $tableField = null): bool
    {
        if ($email === null || $email === '') {
            return true;
        }

        $table = $tableField ?? 'users';
        $field = 'email';
        if (strpos($table, '.') !== false) {
            [$table, $field] = explode('.', $table, 2);
        }

        $builder = \Config\Database::connect()->table($table);
        $builder->where($field, $email);
        $builder->where('deleted_at', null);

        return $builder->countAllResults() === 0;
    }

    /**
     * Validate an H:i or H:i:s time string.
     */
    public function valid_time(?string $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }
        if (! preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $value)) {
            return false;
        }
        $parts = explode(':', $value);
        return (int) $parts[0] <= 23 && (int) $parts[1] <= 59;
    }

    /**
     * Validate a phone number loosely (digits, +, -, spaces).
     */
    public function valid_phone(?string $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }
        return (bool) preg_match('/^\+?[0-9\s\-]{7,20}$/', $value);
    }

    /**
     * Validate a callback URL, allowing any URI scheme (http, https,
     * or app deep links such as busline://) so mobile clients can pass
     * payment redirect callbacks.
     */
    public function valid_url_like(?string $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }
        if (! is_string($value)) {
            $value = (string) $value;
        }
        if (! preg_match('~\A[a-z][a-z0-9+.\-]*://\S+\z~i', $value)) {
            return false;
        }
        return filter_var($value, FILTER_VALIDATE_URL) !== false;
    }
}

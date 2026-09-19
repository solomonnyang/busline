<?php

namespace App\Controllers\API;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Validation\Exceptions\ValidationException;

/**
 * BaseApiController
 * Shared helpers for all API controllers.
 */
abstract class BaseApiController extends BaseController
{
    /**
     * Validate request input against rules and return validated data.
     * On failure, sends a 422 JSON response and terminates execution.
     */
    protected function validateOrFail(array $rules): array
    {
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (! $this->validate($rules)) {
            $response = api_validation_errors($this->validator->getErrors());
            $response->send();
            exit;
        }

        return $data;
    }

    /**
     * Return the authenticated user attached by AuthFilter.
     */
    protected function currentUser(): array
    {
        return (array) ($this->request->user ?? []);
    }

    /**
     * Resolve the current user's vendor profile.
     */
    protected function currentVendor(): array
    {
        $user = $this->currentUser();
        $vendor = model(\App\Models\VendorModel::class)->findByUserId((int) $user['id']);
        if (! $vendor) {
            throw new \RuntimeException('Vendor profile not found.');
        }
        return $vendor;
    }

    /**
     * Resolve the current user's customer profile.
     */
    protected function currentCustomer(): array
    {
        $user = $this->currentUser();
        $customer = model(\App\Models\CustomerModel::class)->findByUserId((int) $user['id']);
        if (! $customer) {
            throw new \RuntimeException('Customer profile not found.');
        }
        return $customer;
    }
}

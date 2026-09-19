<?php

namespace App\Controllers\API;

use App\Services\WalletService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * WalletController
 * Customer wallet endpoints: balance + history, Paystack top-up.
 */
class WalletController extends BaseApiController
{
    protected WalletService $walletService;

    public function __construct()
    {
        $this->walletService = new WalletService();
    }

    /**
     * GET /api/wallet
     * Authenticated customer's wallet balance and transaction history.
     */
    public function index(): ResponseInterface
    {
        try {
            $customer = $this->currentCustomer();
            return api_success($this->walletService->overview((int) $customer['id']));
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 404);
        }
    }

    /**
     * POST /api/wallet/topup
     * Body: { amount, callback_url? }
     */
    public function topup(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'amount'       => 'required|numeric|greater_than_equal_to[100]',
            'callback_url' => 'permit_empty|valid_url_like',
        ]);

        try {
            $customer = $this->currentCustomer();
            $user = model(\App\Models\UserModel::class)->find((int) $customer['user_id']);
            $result = $this->walletService->topup(
                $customer,
                $user['email'] ?? '',
                (float) $data['amount'],
                $data['callback_url'] ?? ''
            );
            return api_success($result, 'Top-up initialized.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/wallet/topup/status/(:segment)
     * Safe status poll for a top-up while checkout is still open.
     * Never marks a transaction failed; only reconciles to success.
     */
    public function status($reference): ResponseInterface
    {
        try {
            $customer = $this->currentCustomer();
            $result = $this->walletService->status($reference, (int) $customer['id']);
            return api_success($result);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 404);
        }
    }

    /**
     * POST /api/wallet/topup/verify
     * Verify a Paystack top-up after redirect.
     * Body: { reference }
     */
    public function verify(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'reference' => 'required',
        ]);

        try {
            $customer = $this->currentCustomer();
            $result = $this->walletService->verifyTopup($data['reference'], (int) $customer['id']);
            return api_success($result, 'Top-up verified successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }
}

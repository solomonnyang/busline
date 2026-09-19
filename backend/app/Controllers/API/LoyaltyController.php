<?php

namespace App\Controllers\API;

use App\Services\LoyaltyService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * LoyaltyController
 * Customer-facing loyalty + referral endpoints: points overview,
 * redemption, program rules and shareable referral-link redirects.
 */
class LoyaltyController extends BaseApiController
{
    protected LoyaltyService $loyalty;

    public function __construct()
    {
        $this->loyalty = new LoyaltyService();
    }

    /**
     * GET /api/loyalty/overview
     * Loyalty balance, history, referral code/link and program rules.
     */
    public function overview(): ResponseInterface
    {
        try {
            $customer = $this->currentCustomer();
            return api_success($this->loyalty->overview((int) $customer['id']));
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 404);
        }
    }

    /**
     * POST /api/loyalty/redeem
     * Redeem loyalty points into the customer's wallet balance.
     * Body: { points }
     */
    public function redeem(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'points' => 'required|is_natural_no_zero',
        ]);

        try {
            $customer = $this->currentCustomer();
            $result = $this->loyalty->redeem((int) $customer['id'], (int) $data['points']);
            return api_success($result, 'Points redeemed to your wallet.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/loyalty/rules
     * Public program rules (same payload the offers page renders).
     */
    public function rules(): ResponseInterface
    {
        return api_success($this->loyalty->rules());
    }

    /**
     * GET /api/o/{code}
     * Public referral-link shortener: redirects to the signup page with
     * the ?ref= code so signups can be attributed.
     */
    public function referralRedirect($code): ResponseInterface
    {
        $user = model(\App\Models\UserModel::class)
            ->where('referral_code', strtoupper(trim((string) $code)))
            ->first();

        if (! $user) {
            return api_error('Referral code not found.', 404);
        }

        $loyalty = new LoyaltyService();
        return redirect()->to($loyalty->referralLink($user['referral_code']));
    }
}

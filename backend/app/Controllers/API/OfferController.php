<?php

namespace App\Controllers\API;

use App\Models\OfferModel;
use App\Services\LoyaltyService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * OfferController
 * Public endpoints for promotional offers shown in the mobile/home slider.
 */
class OfferController extends BaseApiController
{
    /**
     * GET /api/offers
     * Public list of active offers.
     */
    public function index(): ResponseInterface
    {
        $offers = model(OfferModel::class)->findActive();

        foreach ($offers as &$offer) {
            $offer['is_active']      = (int) $offer['is_active'];
            $offer['discount_value'] = (float) $offer['discount_value'];
        }
        unset($offer);

        return api_success($offers);
    }

    /**
     * GET /api/offers/rules
     * Public loyalty/early-bird/referral program rules.
     */
    public function rules(): ResponseInterface
    {
        return api_success((new LoyaltyService())->rules());
    }
}

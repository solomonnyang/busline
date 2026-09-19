<?php

namespace App\Controllers\API;

use App\Services\BookingService;
use App\Services\PaymentService;
use App\Services\WalletService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * WebhookController
 * Accepts Paystack webhooks. Every request is authenticated by its
 * HMAC-SHA-512 signature so forged events can never confirm a booking or
 * credit a wallet.
 */
class WebhookController extends BaseApiController
{
    public function paystack(): ResponseInterface
    {
        $body      = (string) $this->request->getBody(true);
        $signature = $this->request->getHeaderLine('x-paystack-signature');

        if (! (new PaymentService())->verifyWebhookSignature($body, $signature)) {
            log_message('error', 'Paystack webhook rejected: invalid signature.');
            return api_error('Invalid webhook signature.', 400);
        }

        $payload = json_decode($body, true);
        if (! is_array($payload) || ($payload['event'] ?? '') !== 'charge.success') {
            log_message('debug', 'Paystack webhook ignored: ' . (string) ($payload['event'] ?? 'unknown'));
            return api_success(['status' => 'ok']);
        }

        $data      = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $reference = (string) ($data['reference'] ?? '');

        try {
            (new BookingService())->reconcileFromWebhook($reference, $data);
        } catch (\RuntimeException $e) {
            try {
                (new WalletService())->reconcileFromWebhook($reference, $data);
            } catch (\RuntimeException $ex) {
                // A reference that matches no booking or top-up is not ours.
                // Return 200 so Paystack stops retrying it.
                log_message('error', 'Paystack webhook unmatched reference: ' . $reference);
            }
        }

        return api_success(['status' => 'ok']);
    }
}
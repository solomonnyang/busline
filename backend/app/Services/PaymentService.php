<?php

namespace App\Services;

use App\Models\BookingModel;
use App\Models\PaymentModel;

/**
 * PaymentService
 * Integrates with the Paystack API and handles the cash placeholder.
 */
class PaymentService
{
    protected PaymentModel $payments;
    protected BookingModel $bookings;

    public function __construct()
    {
        $this->payments = model(PaymentModel::class);
        $this->bookings = model(BookingModel::class);
    }

    public function secretKey(): string
    {
        return settings('paystack_secret_key', 'payment') ?: env('paystack.secretKey', '');
    }

    public function publicKey(): string
    {
        return settings('paystack_public_key', 'payment') ?: env('paystack.publicKey', '');
    }

    /**
     * Verify an inbound Paystack webhook using its HMAC-SHA-512 signature
     * derived from the raw request body and the Paystack secret key. Paystack
     * sends this header on every webhook; without a valid signature the event
     * is discarded so forged events can never credit a booking or a wallet.
     */
    public function verifyWebhookSignature(string $body, string $signature): bool
    {
        if ($signature === '' || $this->secretKey() === '') {
            return false;
        }

        $expected = hash_hmac('sha512', $body, $this->secretKey());

        return hash_equals($expected, strtolower($signature));
    }

    /**
     * Create a Paystack transaction and return the authorization URL.
     */
    public function initializePaystack(array $payload, string $callbackUrl)
    {
        $http = \Config\Services::curlrequest();
        $response = $http->post('https://api.paystack.co/transaction/initialize', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->secretKey(),
                'Content-Type'  => 'application/json',
            ],
            'json' => [
                'email'       => $payload['email'],
                'amount'      => (int) round($payload['amount'] * 100), // Paystack uses kobo
                'reference'   => $payload['reference'],
                'callback_url'=> $callbackUrl,
                'metadata'    => [
                    'booking_number' => $payload['booking_number'] ?? $payload['reference'],
                    'custom_fields'  => [
                        ['display_name' => 'Booking', 'variable_name' => 'booking_number', 'value' => $payload['booking_number'] ?? $payload['reference']],
                    ],
                ],
            ],
            'timeout' => 30,
        ]);

        $body = json_decode($response->getBody(), true);

        if (! isset($body['status']) || $body['status'] !== true) {
            throw new \RuntimeException($body['message'] ?? 'Unable to initialize payment.');
        }

        return $body['data'];
    }

    /**
     * Confirm a verified Paystack transaction charged exactly the amount we
     * expect (kobo) and the correct currency. Without this, a matching status
     * alone could let an under-paid or wrong-currency transaction be marked
     * paid.
     */
    public function amountMatches(float $expectedNaira, array $verified): bool
    {
        $paidKobo = (int) ($verified['amount'] ?? -1);
        $expectKobo = (int) round($expectedNaira * 100);
        $currency = (string) ($verified['currency'] ?? 'NGN');

        return $paidKobo === $expectKobo && $currency === 'NGN';
    }

    /**
     * Verify a Paystack transaction reference.
     */
    public function verifyPaystack(string $reference): array
    {
        $http = \Config\Services::curlrequest();
        $response = $http->get('https://api.paystack.co/transaction/verify/' . rawurlencode($reference), [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->secretKey(),
            ],
            'timeout' => 30,
        ]);

        $body = json_decode($response->getBody(), true);

        if (! isset($body['status']) || $body['status'] !== true) {
            throw new \RuntimeException($body['message'] ?? 'Unable to verify payment.');
        }

        return $body['data'];
    }

    /**
     * Create a payment record (no external call).
     */
    public function record(array $data): int
    {
        return $this->payments->insert($data);
    }

    /**
     * Update a payment record.
     */
    public function update(int $paymentId, array $data): bool
    {
        return $this->payments->update($paymentId, $data);
    }

    /**
     * All payment records for a booking.
     */
    public function findByBookingId(int $bookingId): array
    {
        return $this->payments->findByBookingId($bookingId);
    }

    /**
     * Find a payment record by its reference.
     */
    public function findByReference(string $reference)
    {
        return $this->payments->findByReference($reference);
    }

    /**
     * Mark a payment + booking as paid.
     */
    public function markPaid(int $paymentId, array $extra = [])
    {
        $this->payments->update($paymentId, array_merge([
            'status'  => 'success',
            'paid_at' => date('Y-m-d H:i:s'),
        ], $extra));

        $payment = $this->payments->find($paymentId);
        $this->bookings->update($payment['booking_id'], [
            'payment_status' => 'paid',
            'status'         => 'confirmed',
        ]);
    }
}

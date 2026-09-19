<?php

namespace App\Services;

use App\Models\BookingModel;
use App\Models\CustomerModel;
use App\Models\LoyaltyPointModel;
use App\Models\ReferralModel;
use App\Models\TripModel;
use App\Models\UserModel;

/**
 * LoyaltyService
 * Manages the loyalty program and referral offers:
 *  - flat loyalty points earned on each paid booking,
 *  - redemption of points to wallet balance,
 *  - referral links and commission on a referred friend's first booking.
 */
class LoyaltyService
{
    protected LoyaltyPointModel $points;
    protected ReferralModel     $referrals;
    protected UserModel         $users;
    protected CustomerModel     $customers;
    protected BookingModel      $bookings;
    protected TripModel         $trips;
    protected WalletService     $wallet;

    public function __construct()
    {
        $this->points    = model(LoyaltyPointModel::class);
        $this->referrals = model(ReferralModel::class);
        $this->users     = model(UserModel::class);
        $this->customers = model(CustomerModel::class);
        $this->bookings  = model(BookingModel::class);
        $this->trips     = model(TripModel::class);
        $this->wallet    = new WalletService();
    }

    // ------------------------------------------------------------------
    // Loyalty points
    // ------------------------------------------------------------------

    public function pointsPerBooking(): int
    {
        return (int) (settings('points_per_booking', 'loyalty') ?: 10);
    }

    public function pointsValueNgn(): float
    {
        return (float) (settings('points_value_ngn', 'loyalty') ?: 1.00);
    }

    public function minPointsRedeem(): int
    {
        return (int) (settings('min_points_redeem', 'loyalty') ?: 10);
    }

    public function balance(int $customerId): int
    {
        return $this->points->balance($customerId);
    }

    /**
     * Award flat loyalty points for a paid booking (idempotent).
     */
    public function awardBookingPoints(int $bookingId): void
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking || $booking['payment_status'] !== 'paid') {
            return;
        }
        if ($this->points->findByBooking($bookingId)) {
            return;
        }

        $points = $this->pointsPerBooking();
        if ($points <= 0) {
            return;
        }

        $this->points->insert([
            'customer_id' => (int) $booking['customer_id'],
            'points'      => $points,
            'type'        => 'earn',
            'source'      => 'booking',
            'description' => 'Loyalty points for booking ' . $booking['booking_number'],
            'reference'   => 'LYP-' . strtoupper(bin2hex(random_bytes(6))),
            'booking_id'  => $bookingId,
        ]);
    }

    /**
     * Redeem loyalty points into wallet balance.
     *
     * @return array{redeemed_points: int, amount: float, balance: int}
     * @throws \RuntimeException when the points cannot be redeemed
     */
    public function redeem(int $customerId, int $points): array
    {
        $points = (int) $points;
        $min    = $this->minPointsRedeem();

        if ($points < $min) {
            throw new \RuntimeException("You can redeem a minimum of {$min} points.");
        }

        $balance = $this->balance($customerId);
        if ($points > $balance) {
            throw new \RuntimeException('You do not have enough points for this redemption.');
        }

        $amount = round($points * $this->pointsValueNgn(), 2);
        if ($amount <= 0) {
            throw new \RuntimeException('The current points value does not support redemption.');
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $reference = 'LYR-' . strtoupper(bin2hex(random_bytes(6)));

            $this->points->insert([
                'customer_id' => $customerId,
                'points'      => -$points,
                'type'        => 'redeem',
                'source'      => 'redeem',
                'description' => 'Redeemed ' . $points . ' points for ₦' . number_format($amount, 2),
                'reference'   => $reference,
            ]);

            $this->wallet->credit($customerId, $amount, $reference, 'Loyalty points redemption (' . $points . ' pts)', 'loyalty');

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'redeemed_points' => $points,
            'amount'          => $amount,
            'balance'         => $this->balance($customerId),
        ];
    }

    // ------------------------------------------------------------------
    // Referrals
    // ------------------------------------------------------------------

    public function commissionPercent(): float
    {
        return (float) (settings('commission_percent', 'referral') ?: 10);
    }

    /**
     * Ensure a user has a referral code (generate one if missing).
     */
    public function ensureReferralCode(int $userId): string
    {
        $user = $this->users->find($userId);
        if (! $user) {
            throw new \RuntimeException('User not found.');
        }
        if (! empty($user['referral_code'])) {
            return $user['referral_code'];
        }

        $code = 'BL' . $userId . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
        $this->users->update($userId, ['referral_code' => $code]);
        return $code;
    }

    /**
     * Link a new customer to a referrer via a referral code.
     * Called during customer registration.
     */
    public function attachReferral(int $userId, int $customerId, string $code): void
    {
        $code = strtoupper(trim($code));
        if ($code === '' || ! preg_match('/^[A-Z0-9]{3,50}$/', $code)) {
            return;
        }

        $referrer = $this->users->where('referral_code', $code)->first();
        if (! $referrer || (int) $referrer['id'] === (int) $userId) {
            return;
        }

        $referrerCustomer = $this->customers->findByUserId((int) $referrer['id']);
        if (! $referrerCustomer) {
            return;
        }

        if ($this->referrals->findByReferredCustomer($customerId)) {
            return;
        }

        $this->referrals->insert([
            'referrer_customer_id' => (int) $referrerCustomer['id'],
            'referred_user_id'     => $userId,
            'referred_customer_id' => $customerId,
            'code'                 => $code,
            'status'               => 'registered',
            'commission_amount'    => 0,
        ]);
    }

    /**
     * Pay the referrer a commission when the referred customer's first
     * booking is paid (idempotent).
     */
    public function awardReferralCommission(int $bookingId): void
    {
        $booking = $this->bookings->find($bookingId);
        if (! $booking || $booking['payment_status'] !== 'paid') {
            return;
        }

        $referral = $this->referrals->findByReferredCustomer((int) $booking['customer_id']);
        if (! $referral || $referral['status'] === 'qualified') {
            return;
        }

        $percent = $this->commissionPercent();
        if ($percent <= 0) {
            return;
        }

        $commission = round((float) $booking['total_amount'] * $percent / 100, 2);
        if ($commission <= 0) {
            return;
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $reference = 'RFC-' . strtoupper(bin2hex(random_bytes(6)));
            $referredUser = $this->users->find((int) $referral['referred_user_id']);

            $this->wallet->credit(
                (int) $referral['referrer_customer_id'],
                $commission,
                $reference,
                'Referral commission from ' . ($referredUser['name'] ?? 'a friend'),
                'referral'
            );

            $this->referrals->update((int) $referral['id'], [
                'status'            => 'qualified',
                'commission_amount' => $commission,
                'booking_id'        => $bookingId,
            ]);

            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }

    /**
     * Award all rewards that apply once a booking is paid.
     * Safe to call repeatedly; every action is idempotent.
     */
    public function awardForPaidBooking(int $bookingId): void
    {
        $this->awardBookingPoints($bookingId);
        $this->awardReferralCommission($bookingId);
    }

    // ------------------------------------------------------------------
    // Customer overview
    // ------------------------------------------------------------------

    /**
     * Loyalty + referral overview for the customer offers page.
     */
    public function overview(int $customerId): array
    {
        $customer = $this->customers->find($customerId);
        $user     = $customer ? $this->users->find((int) $customer['user_id']) : null;
        if (! $customer || ! $user) {
            throw new \RuntimeException('Customer profile not found.');
        }

        $code = $this->ensureReferralCode((int) $user['id']);
        $history = array_map(static function ($row) {
            $row['points'] = (int) $row['points'];
            return $row;
        }, $this->points->history($customerId));

        $referrals = $this->referrals->byReferrer($customerId);
        $commissionEarned = 0.0;
        foreach ($referrals as $r) {
            $commissionEarned += (float) $r['commission_amount'];
        }

        return [
            'balance'             => $this->balance($customerId),
            'history'             => $history,
            'rules'               => $this->rules(),
            'referral_code'       => $code,
            'referral_link'       => $this->referralLink($code),
            'referrals'           => $referrals,
            'commission_earned'   => round($commissionEarned, 2),
        ];
    }

    /**
     * Publicly exposed program rules for clients.
     */
    public function rules(): array
    {
        return [
            'loyalty' => [
                'points_per_booking' => $this->pointsPerBooking(),
                'points_value_ngn'   => $this->pointsValueNgn(),
                'min_points_redeem'  => $this->minPointsRedeem(),
            ],
            'early_bird' => [
                'days'            => (int) (settings('early_bird_days', 'early_bird') ?: 3),
                'discount_percent'=> (float) (settings('early_bird_percent', 'early_bird') ?: 15),
            ],
            'referral' => [
                'commission_percent' => $this->commissionPercent(),
                'signup_url'         => (string) (settings('signup_url', 'referral') ?: 'http://localhost:5173'),
            ],
        ];
    }

    public function referralLink(string $code): string
    {
        $base = rtrim((string) (settings('signup_url', 'referral') ?: 'http://localhost:5173'), '/');
        return $base . '/register?ref=' . urlencode($code);
    }

    /**
     * Early-bird eligibility for a departure date.
     */
    public function earlyBirdFor(string $departureDate): ?array
    {
        $days = (int) (settings('early_bird_days', 'early_bird') ?: 3);
        $percent = (float) (settings('early_bird_percent', 'early_bird') ?: 15);

        $diff = (int) ((strtotime((string) $departureDate) - strtotime(date('Y-m-d'))) / 86400);
        if ($diff < $days) {
            return null;
        }

        return [
            'days'             => $days,
            'discount_percent' => $percent,
            'qualifies'        => true,
        ];
    }
}

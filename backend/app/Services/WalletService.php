<?php

namespace App\Services;

use App\Models\CustomerModel;
use App\Models\UserModel;
use App\Models\WalletModel;
use App\Models\WalletTransactionModel;

/**
 * WalletService
 * Manages customer wallets: lazy creation, Paystack top-ups,
 * idempotent verification and transaction history.
 */
class WalletService
{
    protected WalletModel            $wallets;
    protected WalletTransactionModel $transactions;
    protected PaymentService         $payments;

    public function __construct()
    {
        $this->wallets      = model(WalletModel::class);
        $this->transactions = model(WalletTransactionModel::class);
        $this->payments     = new PaymentService();
    }

    /**
     * Get (or lazily create) the customer's wallet.
     */
    public function wallet(int $customerId): array
    {
        $wallet = $this->wallets->findByCustomerId($customerId);
        if (! $wallet) {
            $id = $this->wallets->insert(['customer_id' => $customerId, 'balance' => 0]);
            $wallet = $this->wallets->find($id);
        }
        return $wallet;
    }

    /**
     * The wallet with its transaction history.
     */
    public function overview(int $customerId): array
    {
        $wallet = $this->wallet($customerId);
        return [
            'wallet'       => $wallet,
            'transactions' => $this->transactions->findByWalletId((int) $wallet['id']),
        ];
    }

    /**
     * Create a pending top-up and initialize a Paystack transaction.
     *
     * @throws \RuntimeException when the amount is invalid or Paystack fails
     */
    public function topup(array $customer, string $email, float $amount, string $callbackUrl = ''): array
    {
        $amount = round($amount, 2);
        if ($amount < 100) {
            throw new \RuntimeException('Minimum top-up is ₦100.');
        }

        $wallet     = $this->wallet((int) $customer['id']);
        $reference  = 'WLT-' . strtoupper(bin2hex(random_bytes(6)));

        $transactionId = $this->transactions->insert([
            'wallet_id'      => (int) $wallet['id'],
            'type'           => 'credit',
            'amount'         => $amount,
            'reference'      => $reference,
            'description'    => 'Wallet top-up',
            'status'         => 'pending',
            'payment_method' => 'paystack',
        ]);

        try {
            $init = $this->payments->initializePaystack([
                'email'     => $email,
                'amount'    => $amount,
                'reference' => $reference,
            ], $callbackUrl);
        } catch (\Throwable $e) {
            throw new \RuntimeException('Unable to initialize top-up. Please check your Paystack configuration.');
        }

        $this->transactions->update($transactionId, [
            'paystack_ref' => $init['reference'] ?? $reference,
        ]);

        return [
            'transaction'       => $this->transactions->find($transactionId),
            'authorization_url' => $init['authorization_url'] ?? null,
        ];
    }

    /**
     * Verify a Paystack top-up and credit the wallet once (idempotent).
     *
     * @throws \RuntimeException when the reference is unknown or unpaid
     */
    public function verifyTopup(string $reference, int $customerId): array
    {
        $transaction = $this->transactions->findByReference($reference);
        if (! $transaction) {
            throw new \RuntimeException('Top-up reference not found.');
        }

        $wallet = $this->wallets->find((int) $transaction['wallet_id']);
        if (! $wallet || (int) $wallet['customer_id'] !== $customerId) {
            throw new \RuntimeException('Top-up not found for this customer.');
        }

        if ($transaction['status'] === 'success') {
            return $this->overview($customerId);
        }

        try {
            $verified = $this->payments->verifyPaystack($reference);
        } catch (\Throwable $e) {
            throw new \RuntimeException('Unable to verify top-up. Please check your Paystack configuration.');
        }

        if (($verified['status'] ?? '') !== 'success') {
            $this->transactions->update((int) $transaction['id'], ['status' => 'failed']);
            throw new \RuntimeException('Top-up was not successful.');
        }

        if (! $this->payments->amountMatches((float) $transaction['amount'], $verified)) {
            throw new \RuntimeException('Top-up amount does not match the charged amount. Please contact support.');
        }

        $this->applyCredit($wallet, $transaction, $verified);
        $this->notifyCredit($wallet, (float) $transaction['amount'], $transaction);

        return $this->overview($customerId);
    }

    /**
     * Safe status check used while the checkout is open. Only ever moves the
     * transaction to success (crediting the wallet); never marks it failed, so
     * it can be polled without side effects.
     *
     * @throws \RuntimeException when the reference is unknown or not owned
     */
    public function status(string $reference, int $customerId): array
    {
        $transaction = $this->transactions->findByReference($reference);
        if (! $transaction) {
            throw new \RuntimeException('Top-up reference not found.');
        }

        $wallet = $this->wallets->find((int) $transaction['wallet_id']);
        if (! $wallet || (int) $wallet['customer_id'] !== $customerId) {
            throw new \RuntimeException('Top-up not found for this customer.');
        }

        if ($transaction['status'] === 'success') {
            return ['status' => 'success'];
        }

        try {
            $verified = $this->payments->verifyPaystack($reference);
        } catch (\Throwable $e) {
            return ['status' => 'pending'];
        }

        if (($verified['status'] ?? '') === 'success' && $this->payments->amountMatches((float) $transaction['amount'], $verified)) {
            $this->applyCredit($wallet, $transaction, $verified);
            $this->notifyCredit($wallet, (float) $transaction['amount'], $transaction);
            return ['status' => 'success'];
        }

        return ['status' => 'pending'];
    }

    /**
     * Charge a booking amount from the customer's wallet.
     * Must be called inside the caller's transaction: the wallet row is
     * locked (SELECT ... FOR UPDATE) so concurrent bookings cannot
     * double-spend the balance.
     *
     * @throws \RuntimeException when the balance is insufficient
     */
    public function charge(int $customerId, float $amount, string $reference, string $description = ''): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            throw new \RuntimeException('Invalid amount.');
        }

        $db     = \Config\Database::connect();
        $wallet = $db->query('SELECT * FROM wallets WHERE customer_id = ? FOR UPDATE', [$customerId])->getRowArray();

        if (! $wallet) {
            $this->wallets->insert(['customer_id' => $customerId, 'balance' => 0]);
            $wallet = $db->query('SELECT * FROM wallets WHERE customer_id = ? FOR UPDATE', [$customerId])->getRowArray();
        }

        if (! $wallet || (float) $wallet['balance'] < $amount) {
            throw new \RuntimeException('Insufficient wallet balance. Please top up your wallet.');
        }

        $this->wallets->debit((int) $wallet['id'], $amount);

        $this->transactions->insert([
            'wallet_id'      => (int) $wallet['id'],
            'type'           => 'debit',
            'amount'         => $amount,
            'reference'      => $reference,
            'description'    => $description ?: 'Booking payment',
            'status'         => 'success',
            'payment_method' => 'wallet',
            'paid_at'        => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Refund a cancelled booking's amount back to the customer's wallet.
     * Must be called inside the caller's transaction.
     *
     * @throws \RuntimeException when the wallet cannot be found
     */
    public function refund(int $customerId, float $amount, string $reference, string $description = ''): void
    {
        $this->credit($customerId, $amount, $reference, $description ?: 'Booking cancellation refund', 'wallet');
    }

    /**
     * Generic wallet credit (top-ups are handled by verifyTopup/applyCredit).
     * Used for loyalty redemptions, referral commissions and refunds.
     * Must be called inside the caller's transaction.
     *
     * @throws \RuntimeException when the amount is invalid or the wallet is missing
     */
    public function credit(int $customerId, float $amount, string $reference, string $description = '', string $method = 'wallet'): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            throw new \RuntimeException('Invalid amount.');
        }

        $db     = \Config\Database::connect();
        $wallet = $db->query('SELECT * FROM wallets WHERE customer_id = ? FOR UPDATE', [$customerId])->getRowArray();
        if (! $wallet) {
            $this->wallets->insert(['customer_id' => $customerId, 'balance' => 0]);
            $wallet = $db->query('SELECT * FROM wallets WHERE customer_id = ? FOR UPDATE', [$customerId])->getRowArray();
        }
        if (! $wallet) {
            throw new \RuntimeException('Wallet could not be created for this customer.');
        }

        $this->wallets->credit((int) $wallet['id'], $amount);

        $this->transactions->insert([
            'wallet_id'      => (int) $wallet['id'],
            'type'           => 'credit',
            'amount'         => $amount,
            'reference'      => $reference,
            'description'    => $description ?: 'Wallet credit',
            'status'         => 'success',
            'payment_method' => $method,
            'paid_at'        => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Admin-initiated credit to a customer wallet.
     *
     * @throws \RuntimeException when the amount is invalid
     */
    public function adminCredit(int $customerId, float $amount, string $note = ''): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            throw new \RuntimeException('Invalid amount.');
        }

        $wallet = $this->wallet($customerId);
        $this->wallets->credit((int) $wallet['id'], $amount);
        $this->transactions->insert([
            'wallet_id'      => (int) $wallet['id'],
            'type'           => 'credit',
            'amount'         => $amount,
            'reference'      => 'ADM-' . strtoupper(bin2hex(random_bytes(6))),
            'description'    => $note ?: 'Admin adjustment (credit)',
            'status'         => 'success',
            'payment_method' => 'admin',
            'paid_at'        => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Admin-initiated debit from a customer wallet.
     *
     * @throws \RuntimeException when the amount is invalid or the balance is insufficient
     */
    public function adminDebit(int $customerId, float $amount, string $note = ''): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            throw new \RuntimeException('Invalid amount.');
        }

        $db     = \Config\Database::connect();
        $wallet = $db->query('SELECT * FROM wallets WHERE customer_id = ? FOR UPDATE', [$customerId])->getRowArray();
        if (! $wallet) {
            throw new \RuntimeException('Wallet not found for this customer.');
        }
        if ((float) $wallet['balance'] < $amount) {
            throw new \RuntimeException('Insufficient wallet balance.');
        }

        $this->wallets->debit((int) $wallet['id'], $amount);
        $this->transactions->insert([
            'wallet_id'      => (int) $wallet['id'],
            'type'           => 'debit',
            'amount'         => $amount,
            'reference'      => 'ADM-' . strtoupper(bin2hex(random_bytes(6))),
            'description'    => $note ?: 'Admin adjustment (debit)',
            'status'         => 'success',
            'payment_method' => 'admin',
            'paid_at'        => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Best-effort email notification when a wallet is credited.
     */
    protected function notifyCredit(array $wallet, float $amount, array $transaction): void
    {
        try {
            $customer = model(CustomerModel::class)->find((int) $wallet['customer_id']);
            $user     = $customer ? model(UserModel::class)->find((int) $customer['user_id']) : null;
            if ($user) {
                (new EmailService())->walletCredit($user, $amount, $this->wallets->find((int) $wallet['id']), $transaction);
                (new NotificationService())->notify(
                    (int) $user['id'],
                    'wallet_credit',
                    'Wallet credited',
                    '₦' . number_format($amount, 2) . ' was added to your wallet (' . trim($transaction['description'] ?? '') . ').',
                    ['reference' => $transaction['reference'] ?? null]
                );
            }
        } catch (\Throwable $e) {
            // ignore mail/notification failures
        }
    }

    /**
     * Server-side reconciliation from a verified Paystack webhook event. Used
     * when the customer closes the checkout before the status/verify endpoint
     * runs, so the wallet still gets credited. Idempotent, and amount-guarded
     * exactly like verifyTopup().
     *
     * @throws \RuntimeException when the reference matches no wallet top-up
     */
    public function reconcileFromWebhook(string $reference, array $webhook): void
    {
        $transaction = $this->transactions->findByReference($reference);
        if (! $transaction) {
            throw new \RuntimeException('Top-up reference not found.');
        }

        if ($transaction['status'] === 'success' || ($webhook['status'] ?? '') !== 'success') {
            return;
        }

        if (! $this->payments->amountMatches((float) $transaction['amount'], $webhook)) {
            log_message('error', 'Paystack webhook amount mismatch for top-up {ref}', ['ref' => $reference]);
            return;
        }

        $wallet = $this->wallets->find((int) $transaction['wallet_id']);
        if (! $wallet) {
            return;
        }

        $this->applyCredit($wallet, $transaction, $webhook);
        $this->notifyCredit($wallet, (float) $transaction['amount'], $transaction);
    }

    /**
     * Credit the wallet and mark the transaction paid in one transaction.
     */
    protected function applyCredit(array $wallet, array $transaction, array $verified): void
    {
        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->wallets->credit((int) $wallet['id'], (float) $transaction['amount']);
            $this->transactions->update((int) $transaction['id'], [
                'status'      => 'success',
                'paystack_ref'=> $verified['reference'] ?? $transaction['paystack_ref'],
                'paid_at'     => date('Y-m-d H:i:s'),
            ]);
            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }
}

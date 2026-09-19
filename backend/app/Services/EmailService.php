<?php

namespace App\Services;

use CodeIgniter\Config\Services;

/**
 * EmailService
 * Sends transactional, HTML-styled emails (welcome, password reset,
 * booking confirmations, wallet credits, etc.) using the shared
 * app/Views/emails/layout.php shell.
 */
class EmailService
{
    protected string $fromEmail;
    protected string $fromName;

    public function __construct()
    {
        $config = config(\Config\Email::class);
        $this->fromEmail = $config->fromEmail ?: 'no-reply@busline.ng';
        $this->fromName  = $config->fromName ?: 'BusLine';
    }

    /**
     * The frontend base URL used to build links inside emails.
     */
    public function frontendUrl(): string
    {
        $url = settings('frontend_url', 'general');
        if (empty($url)) {
            $url = env('app.frontendURL', '');
        }
        return rtrim($url ?: (string) base_url(), '/');
    }

    /**
     * Render an email view inside the shared layout and send it.
     */
    public function send(string $to, string $subject, string $view, array $data = []): bool
    {
        $data['fromEmail'] = $this->fromEmail;
        $data['fromName']  = $this->fromName;
        $data['siteUrl']   = $this->frontendUrl();

        $body = view('emails/' . $view, $data);
        $html = view('emails/layout', array_merge($data, [
            'title' => $subject,
            'body'  => $body,
        ]));

        $email = Services::email();
        $email->setFrom($this->fromEmail, $this->fromName);
        $email->setTo($to);
        $email->setSubject($subject);
        $email->setMailType('html');
        $email->setMessage($html);
        $email->setAltMessage(strip_tags($body));

        return $email->send();
    }

    /**
     * Welcome email after a customer registers.
     */
    public function welcome(array $user, array $data = []): void
    {
        $this->send(
            $user['email'],
            'Welcome to BusLine, ' . ($user['name'] ?? '') . '!',
            'welcome',
            array_merge(['user' => $user], $data)
        );
    }

    /**
     * Notify a vendor that their account is pending approval.
     */
    public function vendorPending(array $user, array $vendor = []): void
    {
        $this->send(
            $user['email'],
            'Your BusLine vendor account is under review',
            'vendor_pending',
            ['user' => $user, 'vendor' => $vendor]
        );
    }

    /**
     * Notify a vendor that their account was approved (or rejected/suspended).
     */
    public function vendorStatus(array $user, array $vendor = [], string $status = 'approved'): void
    {
        $this->send(
            $user['email'],
            $status === 'approved' ? 'Your BusLine vendor account was approved!' : 'Your BusLine vendor account status was updated',
            $status === 'approved' ? 'vendor_approved' : 'vendor_rejected',
            ['user' => $user, 'vendor' => $vendor, 'status' => $status]
        );
    }

    /**
     * Send the email verification code + auto-verify link after registration.
     */
    public function verification(array $user, string $code): void
    {
        $this->send(
            $user['email'],
            'Verify your BusLine email',
            'verify_email',
            ['user' => $user, 'code' => $code]
        );
    }

    /**
     * Send the password reset link.
     */
    public function passwordReset(array $user, string $token): void
    {
        $this->send(
            $user['email'],
            'Reset your BusLine password',
            'password_reset',
            ['user' => $user, 'token' => $token]
        );
    }

    /**
     * Email sent immediately after a booking is created (payment pending).
     */
    public function bookingCreated(array $user, array $booking, array $seats = []): void
    {
        $this->send(
            $user['email'],
            'We received your booking ' . ($booking['booking_number'] ?? ''),
            'booking_created',
            ['user' => $user, 'booking' => $booking, 'seats' => $seats]
        );
    }

    /**
     * Email sent once the booking is paid and confirmed.
     */
    public function bookingConfirmed(array $user, array $booking, array $seats = []): void
    {
        $this->send(
            $user['email'],
            'Your ticket is confirmed! ' . ($booking['booking_number'] ?? ''),
            'booking_confirmed',
            ['user' => $user, 'booking' => $booking, 'seats' => $seats]
        );
    }

    /**
     * Email sent when a booking is cancelled.
     */
    public function bookingCancelled(array $user, array $booking): void
    {
        $this->send(
            $user['email'],
            'Your booking ' . ($booking['booking_number'] ?? '') . ' was cancelled',
            'booking_cancelled',
            ['user' => $user, 'booking' => $booking]
        );
    }

    /**
     * Email sent when a wallet top-up is credited.
     */
    public function walletCredit(array $user, float $amount, array $wallet, array $transaction = []): void
    {
        $this->send(
            $user['email'],
            'Wallet top-up received',
            'wallet_credit',
            ['user' => $user, 'amount' => $amount, 'wallet' => $wallet, 'transaction' => $transaction]
        );
    }
}

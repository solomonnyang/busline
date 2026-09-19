<?php

namespace App\Services;

use App\Models\NotificationModel;
use App\Models\PushTokenModel;
use App\Models\UserModel;

/**
 * PushNotificationService
 * Delivers remote push notifications through the Expo Push API and mirrors
 * them into the in-app notifications table so users see them even offline.
 */
class PushNotificationService
{
    protected PushTokenModel $tokens;
    protected NotificationModel $notifications;

    public function __construct()
    {
        $this->tokens       = model(PushTokenModel::class);
        $this->notifications = model(NotificationModel::class);
    }

    /**
     * Send a push notification to a single user's active devices.
     *
     * @param bool $writeInApp also mirror into the in-app notifications table.
     */
    public function notifyUser(int $userId, string $title, string $message, ?array $data = null, bool $writeInApp = true): array
    {
        $tokens = $this->tokens->activeTokensForUser($userId);
        return $this->deliver($userId, $tokens, $title, $message, $data, $writeInApp);
    }

    /**
     * Send a push notification to many users' active devices (e.g. a broadcast).
     */
    public function notifyUsers(array $userIds, string $title, string $message, ?array $data = null, bool $writeInApp = true): array
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        $tokens  = $this->tokens->activeTokensForUsers($userIds);
        $results = [];

        // Group tokens by user so we can write the in-app notification per user.
        $byUser = [];
        foreach ($tokens as $t) {
            $byUser[(int) $t['user_id']][] = $t;
        }

        foreach ($byUser as $userId => $userTokens) {
            $results[$userId] = $this->deliver((int) $userId, $userTokens, $title, $message, $data, $writeInApp);
        }

        return $results;
    }

    /**
     * Register (or re-enable) a push token for a user.
     */
    public function register(int $userId, string $token, ?string $platform = 'ios', ?string $device = null): void
    {
        $existing = $this->tokens->findByToken($token);
        if ($existing) {
            $this->tokens->update((int) $existing['id'], [
                'user_id'   => $userId,
                'platform'  => $platform ?: $existing['platform'],
                'device'    => $device,
                'is_active' => 1,
            ]);
            return;
        }
        $this->tokens->insert([
            'user_id'   => $userId,
            'token'     => $token,
            'platform'  => $platform ?: 'ios',
            'device'    => $device,
            'is_active' => 1,
        ]);
    }

    /**
     * Deactivate a push token (logout or explicit opt-out).
     */
    public function unregister(string $token): void
    {
        $existing = $this->tokens->findByToken($token);
        if ($existing) {
            $this->tokens->deactivate((int) $existing['id']);
        }
    }

    /**
     * Deliver a push to the given tokens, write an in-app notification for the
     * owning user, and deactivate any tokens the push service reports as invalid.
     */
    protected function deliver(int $userId, array $tokens, string $title, string $message, ?array $data = null, bool $writeInApp = true): array
    {
        $result = [
            'sent'      => 0,
            'invalid'   => 0,
            'tokens'    => count($tokens),
        ];

        if (! empty($tokens)) {
            $receipts = $this->sendExpo($tokens, $title, $message, $data);
            foreach ($receipts as $i => $receipt) {
                $status = $receipt['status'] ?? 'error';
                if ($status === 'ok') {
                    $result['sent']++;
                } else {
                    // Deactivate tokens the provider flags as invalid/expired.
                    if (in_array($status, ['error', 'DeviceNotRegistered', 'InvalidToken'], true)
                        || isset($receipt['details']['error'])) {
                        $this->tokens->deactivate((int) $tokens[$i]['id']);
                        $result['invalid']++;
                    }
                }
            }
        }

        // Mirror into the in-app notification inbox unless the caller is already
        // writing its own (e.g. NotificationService::notify handles both).
        if ($writeInApp) {
            $this->notifications->insert([
                'user_id' => $userId,
                'type'    => 'admin',
                'title'   => $title,
                'message' => $message,
                'data'    => $data ? json_encode($data) : null,
                'is_read' => 0,
            ]);
        }

        return $result;
    }

    /**
     * POST a batch of push messages to the Expo Push API.
     */
    protected function sendExpo(array $tokens, string $title, string $message, ?array $data = null): array
    {
        $accessToken = env('EXPO_ACCESS_TOKEN', '');

        $messages = array_map(function ($t) use ($title, $message, $data) {
            return [
                'to'    => $t['token'],
                'title' => $title,
                'body'  => $message,
                'sound' => 'default',
                'data'  => $data,
            ];
        }, array_values($tokens));

        $headers = ['Content-Type: application/json'];
        if ($accessToken) {
            $headers[] = 'Authorization: Bearer ' . $accessToken;
        }

        $ch = curl_init('https://exp.host/--/api/v2/push/send');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($messages),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $raw  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200 || ! $raw) {
            return [];
        }

        $body = json_decode($raw, true);
        return $body['data'] ?? [];
    }
}

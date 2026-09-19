<?php

namespace App\Controllers\API;

use App\Services\PushNotificationService;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * PushController
 * Mobile push-token registration/unregistration used by the Expo app so the
 * backend knows which devices belong to which user.
 */
class PushController extends BaseApiController
{
    /**
     * POST /api/push/register
     * Body: { token, platform?, device? }
     * Stores/upserts the device's Expo push token for the authenticated user.
     */
    public function register(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'token'    => 'required|max_length[255]',
            'platform' => 'permit_empty|max_length[30]',
            'device'   => 'permit_empty|max_length[100]',
        ]);

        $user = $this->currentUser();

        (new PushNotificationService())->register(
            (int) $user['id'],
            trim($data['token']),
            $data['platform'] ?? 'ios',
            $data['device'] ?? null,
        );

        return api_success(null, 'Push token registered.');
    }

    /**
     * POST /api/push/unregister
     * Body: { token }
     * Deactivates a device token (logout / opt-out).
     */
    public function unregister(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'token' => 'required|max_length[255]',
        ]);

        (new PushNotificationService())->unregister(trim($data['token']));

        return api_success(null, 'Push token removed.');
    }
}

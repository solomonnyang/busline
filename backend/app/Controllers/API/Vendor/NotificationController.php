<?php

namespace App\Controllers\API\Vendor;

use App\Models\NotificationModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * NotificationController
 * In-app notifications for the authenticated user (owner or staff).
 */
class NotificationController extends BaseVendorController
{
    protected NotificationModel $notifications;

    public function __construct()
    {
        $this->notifications = model(NotificationModel::class);
    }

    /**
     * GET /api/vendor/notifications
     */
    public function index(): ResponseInterface
    {
        $user = $this->currentUser();
        $limit = min(100, max(1, (int) ($this->request->getGet('limit') ?: 50)));
        return api_success($this->notifications->forUser((int) $user['id'], $limit));
    }

    /**
     * GET /api/vendor/notifications/unread
     */
    public function unread(): ResponseInterface
    {
        $user = $this->currentUser();
        return api_success(['unread' => $this->notifications->unreadCount((int) $user['id'])]);
    }

    /**
     * PUT /api/vendor/notifications/(:num)/read
     */
    public function markRead(int $id): ResponseInterface
    {
        $user = $this->currentUser();
        $notification = $this->notifications->find($id);
        if (! $notification || (int) $notification['user_id'] !== (int) $user['id']) {
            return api_error('Notification not found.', 404);
        }

        $this->notifications->update($id, ['is_read' => 1, 'read_at' => date('Y-m-d H:i:s')]);
        return api_success(null, 'Notification marked as read.');
    }

    /**
     * PUT /api/vendor/notifications/read-all
     */
    public function markAllRead(): ResponseInterface
    {
        $user = $this->currentUser();
        $this->notifications->markAllRead((int) $user['id']);
        return api_success(null, 'All notifications marked as read.');
    }
}

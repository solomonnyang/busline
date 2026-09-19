<?php

namespace App\Controllers\API\Vendor;

use App\Models\AuditLogModel;
use App\Models\LoginHistoryModel;
use App\Models\SessionModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * SecurityController
 * Login history, active JWT sessions, session revocation and audit log.
 */
class SecurityController extends BaseVendorController
{
    protected SessionModel      $sessions;
    protected LoginHistoryModel $loginHistory;
    protected AuditLogModel     $audits;

    public function __construct()
    {
        $this->sessions     = model(SessionModel::class);
        $this->loginHistory = model(LoginHistoryModel::class);
        $this->audits       = model(AuditLogModel::class);
    }

    /**
     * GET /api/vendor/security/login-history
     */
    public function loginHistory(): ResponseInterface
    {
        $user = $this->currentUser();
        return api_success($this->loginHistory->forUser((int) $user['id'], 100));
    }

    /**
     * GET /api/vendor/security/sessions
     */
    public function sessions(): ResponseInterface
    {
        $user    = $this->currentUser();
        $current = hash('sha256', $this->bearerToken());
        $rows    = $this->sessions->activeForUser((int) $user['id']);

        foreach ($rows as &$row) {
            $row['is_current'] = $row['token_hash'] === $current;
        }
        unset($row);

        return api_success($rows);
    }

    /**
     * POST /api/vendor/security/sessions/revoke
     */
    public function revokeSession(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'session_id' => 'required|is_natural_no_zero',
        ]);

        $user    = $this->currentUser();
        $session = $this->sessions->find((int) $data['session_id']);
        if (! $session || (int) $session['user_id'] !== (int) $user['id']) {
            return api_error('Session not found.', 404);
        }

        $this->sessions->revoke((int) $session['id']);
        return api_success(null, 'Session revoked. The device will be signed out on its next request.');
    }

    /**
     * POST /api/vendor/security/logout-all
     * Revoke every session except the current one.
     */
    public function logoutAll(): ResponseInterface
    {
        $user    = $this->currentUser();
        $current = $this->sessions->findByHash(hash('sha256', $this->bearerToken()));
        $this->sessions->revokeAllForUser((int) $user['id'], $current ? (int) $current['id'] : null);

        return api_success(null, 'All other sessions have been signed out.');
    }

    /**
     * GET /api/vendor/security/audit-log
     */
    public function auditLog(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        return api_success($this->audits->findByVendorId((int) $vendor['id']));
    }

    protected function bearerToken(): string
    {
        $header = $this->request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
}

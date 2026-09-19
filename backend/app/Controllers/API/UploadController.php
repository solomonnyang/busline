<?php

namespace App\Controllers\API;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * UploadController
 * Accepts an authenticated image upload (currently avatars) and stores it in
 * the public uploads directory so the returned URL is directly fetchable.
 *
 * POST /api/upload  multipart form: file=<image>
 */
class UploadController extends BaseApiController
{
    /** Maximum accepted image size in bytes (5 MB). */
    protected int $maxBytes = 5 * 1024 * 1024;

    /** Allowed image extensions + mime types. */
    protected const ALLOWED = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp',
        'gif'  => 'image/gif',
    ];

    /**
     * POST /api/upload
     */
    public function store(): ResponseInterface
    {
        $file = $this->request->getFile('file');

        if ($file === null) {
            return api_error('No image file provided.', 422);
        }
        if (! $file->isValid()) {
            return api_error('The image upload failed: ' . $file->getErrorString(), 422);
        }
        if ($file->getSize() > $this->maxBytes) {
            return api_error('Image is too large (max 5 MB).', 413);
        }

        $mime = $file->getMimeType();
        $ext = array_search($mime, self::ALLOWED, true);
        if ($ext === false) {
            return api_error('Only JPG, PNG, WEBP and GIF images are allowed.', 422);
        }

        $dir = FCPATH . 'uploads' . DIRECTORY_SEPARATOR . 'avatars';
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $name = time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;

        try {
            $file->move($dir . DIRECTORY_SEPARATOR, $name, true);
        } catch (\Throwable $e) {
            log_message('error', 'Upload: could not store image: ' . $e->getMessage());
            return api_error('Could not store the image. Please try again.', 500);
        }

        // Store a host-relative path so the same picture resolves correctly
        // from every client (iOS / Android / web) no matter which host each
        // platform uses to reach the API.
        return api_success([
            'url' => '/uploads/avatars/' . $name,
        ], 'Image uploaded.');
    }
}

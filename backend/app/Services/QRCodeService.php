<?php

namespace App\Services;

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\Common\EccLevel;

/**
 * QRCodeService
 * Generates QR codes for booking tickets using chillerlan/php-qrcode.
 */
class QRCodeService
{
    protected string $dir;

    public function __construct()
    {
        $this->dir = WRITEPATH . 'qr';
        if (! is_dir($this->dir)) {
            mkdir($this->dir, 0777, true);
        }
    }

    /**
     * Encode a string to a PNG data URI (renderable by <img> and React Native Image).
     */
    public function toDataUri(string $payload): string
    {
        $options = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64'    => true,
            'eccLevel'        => EccLevel::M,
            'scale'           => 6,
        ]);

        return (new QRCode($options))->render($payload);
    }

    /**
     * Write a PNG file and return its URL.
     */
    public function toFile(string $payload, string $filename): string
    {
        $path = $this->dir . '/' . $filename . '.png';

        $options = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'eccLevel'        => EccLevel::M,
            'scale'           => 8,
        ]);
        (new QRCode($options))->render($payload, $path);

        return base_url('writable/qr/' . $filename . '.png');
    }

    /**
     * Generate a ticket verification token for a booking.
     */
    public function makeTicketToken(int $bookingId, string $bookingNumber): string
    {
        return 'ticket:' . $bookingNumber . ':' . $bookingId . ':' . md5($bookingNumber . env('app.encryptionKey', 'busline'));
    }
}

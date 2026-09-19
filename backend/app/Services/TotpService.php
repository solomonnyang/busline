<?php

namespace App\Services;

/**
 * TotpService
 * TOTP (RFC 6238) implementation compatible with Google Authenticator.
 * Provides secret generation, provisioning URI building, code verification
 * and single-use backup codes. No external dependencies.
 */
class TotpService
{
    /** @var int Code validity window in seconds. */
    public const PERIOD = 30;

    /** @var int Number of codes (steps) checked on each side of the current step. */
    public const WINDOW = 1;

    /** @var int Number of backup codes generated. */
    public const BACKUP_CODE_COUNT = 8;

    /** @var int Number of backup codes that must remain before rotation is suggested. */
    public const BACKUP_CODE_LOW = 3;

    protected const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a random 160-bit Base32 secret for TOTP.
     */
    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    /**
     * Build the otpauth:// provisioning URI accepted by Google Authenticator.
     */
    public function generateUri(string $secret, string $accountName, string $issuer = 'BusLine'): string
    {
        $account = str_replace(':', '%3A', $accountName);

        return 'otpauth://totp/' . rawurlencode($issuer) . ':' . $account
            . '?secret=' . $secret
            . '&issuer=' . rawurlencode($issuer)
            . '&algorithm=SHA1'
            . '&digits=6'
            . '&period=' . self::PERIOD;
    }

    /**
     * Verify a 6-digit TOTP code allowing for a small clock-drift window.
     */
    public function verify(string $secret, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code);
        if (! preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $binary = $this->base32Decode($secret);
        if ($binary === '') {
            return false;
        }

        $current = (int) floor(time() / self::PERIOD);

        for ($offset = -self::WINDOW; $offset <= self::WINDOW; $offset++) {
            $expected = $this->generateCode($binary, $current + $offset);
            if (hash_equals($expected, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate a batch of backup codes.
     *
     * @return array{plain: string[], hashes: string[]}
     */
    public function generateBackupCodes(int $count = self::BACKUP_CODE_COUNT): array
    {
        $plain  = [];
        $hashes = [];

        for ($i = 0; $i < $count; $i++) {
            $code  = $this->formatBackupCode($this->base32Encode(random_bytes(10)));
            $plain[]  = $code;
            $hashes[] = hash('sha256', $code);
        }

        return ['plain' => $plain, 'hashes' => $hashes];
    }

    /**
     * Try to match a submitted backup code against stored hashes.
     * Returns the list of remaining hashes on success, null on failure.
     *
     * @param string[] $storedHashes
     * @return string[]|null
     */
    public function consumeBackupCode(array $storedHashes, string $code): ?array
    {
        $code = strtoupper(preg_replace('/\s+/', '', $code));
        $hash = hash('sha256', $code);

        foreach ($storedHashes as $index => $stored) {
            if (hash_equals((string) $stored, $hash)) {
                unset($storedHashes[$index]);
                return array_values($storedHashes);
            }
        }

        return null;
    }

    /**
     * Format 10 raw Base32 characters into a readable XXXXX-XXXXX code.
     */
    protected function formatBackupCode(string $base32): string
    {
        $normalized = strtoupper($base32);
        $first = substr($normalized, 0, 5);
        $second = substr($normalized, 5, 5);

        return $first . '-' . $second;
    }

    /**
     * Compute the current TOTP value (HMAC-SHA1, 6 digits).
     */
    protected function generateCode(string $keyBinary, int $counter): string
    {
        $time = pack('J', $counter);
        $hash = hash_hmac('sha1', $time, $keyBinary, true);

        $offset = ord($hash[19]) & 0x0F;
        $binary = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($binary % 1000000), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Encode raw bytes as Base32 (RFC 4648, no padding).
     */
    protected function base32Encode(string $data): string
    {
        $bits = '';
        $length = strlen($data);

        for ($i = 0; $i < $length; $i++) {
            $bits .= str_pad(decbin(ord($data[$i])), 8, '0', STR_PAD_LEFT);
        }

        $output = '';
        $chars = str_split($bits, 5);
        foreach ($chars as $chunk) {
            $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            $output .= self::ALPHABET[bindec($chunk)];
        }

        return $output;
    }

    /**
     * Decode a Base32 string back to raw bytes (RFC 4648, padding optional).
     */
    protected function base32Decode(string $data): string
    {
        $data = strtoupper(preg_replace('/[\s=]+/', '', $data));
        if ($data === '') {
            return '';
        }

        $bits = '';
        $length = strlen($data);

        for ($i = 0; $i < $length; $i++) {
            $char = $data[$i];
            $pos  = strpos(self::ALPHABET, $char);
            if ($pos === false) {
                return '';
            }
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $output = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $output .= chr(bindec($chunk));
            }
        }

        return $output;
    }
}

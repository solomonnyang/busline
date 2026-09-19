<?php

namespace App\Controllers\API;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * VoiceController
 * Speech-to-text for the AI chat mic. Accepts an audio file upload and
 * transcribes it through an OpenAI-compatible /audio/transcriptions endpoint
 * (OpenAI Whisper or a compatible provider such as Groq).
 *
 * POST /api/voice/transcribe  multipart form: file=<audio>
 */
class VoiceController extends BaseApiController
{
    /** Maximum accepted upload size in bytes (15 MB). */
    protected int $maxBytes = 15 * 1024 * 1024;

    /**
     * POST /api/voice/transcribe
     */
    public function transcribe(): ResponseInterface
    {
        $file = $this->request->getFile('file');

        if ($file === null) {
            return api_error('No audio file provided.', 422);
        }
        if (! $file->isValid()) {
            return api_error('The audio upload failed: ' . $file->getErrorString(), 422);
        }
        if ($file->getSize() > $this->maxBytes) {
            return api_error('Audio is too large (max 15 MB).', 413);
        }

        $apiKey = (string) env('voice.sttApiKey', '');
        if ($apiKey === '') {
            log_message('error', 'Voice: voice.sttApiKey is not configured in backend/.env');
            return api_error('Voice input is not configured yet. Please try again later.', 503);
        }

        $baseUrl = rtrim((string) env('voice.sttBaseUrl', 'https://api.openai.com/v1'), '/');
        $model   = (string) env('voice.sttModel', 'whisper-1');

        $ch = curl_init($baseUrl . '/audio/transcriptions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_TIMEOUT        => 90,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_POSTFIELDS     => [
                'model'           => $model,
                'response_format' => 'json',
                'file'            => new \CURLFile($file->getTempName(), $file->getClientMimeType(), $file->getClientName()),
            ],
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
            ],
        ]);

        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            log_message('error', 'Voice: STT transport error: ' . $err);
            return api_error('Could not reach the speech-to-text service. Please try again.', 502);
        }

        $json = json_decode($raw, true);
        if ($httpCode !== 200 || ! is_array($json)) {
            log_message('error', 'Voice: STT API ' . $httpCode . ': ' . $raw);
            $message = is_array($json) && isset($json['error']['message'])
                ? (string) $json['error']['message']
                : 'Speech-to-text failed. Please try again.';
            return api_error($message, $httpCode === 0 ? 502 : $httpCode);
        }

        $text = trim((string) ($json['text'] ?? ''));
        if ($text === '') {
            return api_error('I could not hear anything. Please try again.', 422);
        }

        return api_success(['text' => $text], 'Transcribed');
    }
}

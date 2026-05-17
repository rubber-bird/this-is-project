<?php

final class GeminiAssistantClient
{
    private const MODEL = 'gemini-2.5-flash-lite';
    private const REQUEST_TIMEOUT_SECONDS = 90;

    public function __construct(
        private readonly ?string $apiKey,
    ) {}

    /**
     * @param list<array{role: string, text: string}> $history
     * @return array{text: string, error: string|null}
     */
    public function complete(string $systemPrompt, array $history, string $userPrompt): array {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            . self::MODEL
            . ':generateContent?key='
            . rawurlencode($this->apiKey);

        $contents = [];
        foreach ($history as $turn) {
            $gemRole = $turn['role'] === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $gemRole,
                'parts' => [['text' => $turn['text']]],
            ];
        }
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $userPrompt]],
        ];

        $payload = json_encode([
            'systemInstruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 8192,
                'responseMimeType' => 'application/json',
            ],
        ]);

        if ($payload === false) {
            return ['text' => '', 'error' => 'Failed to serialize AI request'];
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => self::REQUEST_TIMEOUT_SECONDS,
                'ignore_errors' => true,
            ],
        ]);

        $responseText = @file_get_contents($url, false, $ctx);
        if ($responseText === false) {
            return ['text' => '', 'error' => 'Failed to contact Gemini API'];
        }

        $decoded = json_decode($responseText, true);
        if (!is_array($decoded)) {
            return ['text' => '', 'error' => 'Gemini response was not JSON'];
        }
        if (isset($decoded['error']['message'])) {
            return ['text' => '', 'error' => 'Gemini API error: ' . (string) $decoded['error']['message']];
        }

        $text = (string) ($decoded['candidates'][0]['content']['parts'][0]['text'] ?? '');
        if ($text === '') {
            return ['text' => '', 'error' => 'Gemini returned empty output'];
        }

        return ['text' => $text, 'error' => null];
    }

    public static function decodeModelPayload(string $text): mixed {
        $trimmed = trim($text);
        if (str_starts_with($trimmed, '```')) {
            $trimmed = preg_replace('/^```[a-zA-Z]*\s*/', '', $trimmed) ?? $trimmed;
            $trimmed = preg_replace('/\s*```$/', '', $trimmed) ?? $trimmed;
            $trimmed = trim($trimmed);
        }

        return json_decode($trimmed, true);
    }
}

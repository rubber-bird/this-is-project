<?php

final class EnvConfig
{
    /**
     * @return array<string, mixed>
     */
    public static function loadJson(string $baseDir): array
    {
        $path = $baseDir . DIRECTORY_SEPARATOR . 'env.json';
        if (!is_readable($path)) {
            throw new RuntimeException(
                'Missing env.json. Copy env.example.json to env.json and configure it. See backend/README.md.'
            );
        }
        $json = file_get_contents($path);
        if ($json === false) {
            throw new RuntimeException('Could not read env.json');
        }
        $data = json_decode($json, true);
        if (!is_array($data)) {
            throw new RuntimeException('env.json must contain a JSON object');
        }
        return $data;
    }

    public static function geminiApiKey(array $env): ?string
    {
        $fromEnv = getenv('GEMINI_API_KEY');
        if (is_string($fromEnv) && $fromEnv !== '') {
            return $fromEnv;
        }
        $fromFile = $env['gemini_api_key'] ?? null;
        if (is_string($fromFile) && $fromFile !== '') {
            return $fromFile;
        }
        return null;
    }
}

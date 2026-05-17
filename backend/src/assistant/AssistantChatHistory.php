<?php

final class AssistantChatHistory
{
    /**
     * @return list<array{role: string, text: string}>
     */
    public static function normalizeAndCap(mixed $raw, int $maxItems): array {
        if (!is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }
            $role = strtolower(trim((string) ($item['role'] ?? '')));
            $text = trim((string) ($item['text'] ?? ''));
            if ($text === '' || ($role !== 'user' && $role !== 'assistant')) {
                continue;
            }
            $out[] = ['role' => $role, 'text' => $text];
        }

        if (count($out) > $maxItems) {
            $out = array_slice($out, -$maxItems);
        }

        while ($out !== [] && $out[0]['role'] === 'assistant') {
            array_shift($out);
        }

        return $out;
    }
}

<?php

require_once __DIR__ . '/BlockNoteJson.php';

/**
 * Normalizes AI-generated BlockNote JSON so the client editor can load it.
 */
final class BlockNoteImportNormalizer
{
    /** @var array<string, string> */
    private const DEFAULT_BLOCK_PROPS = [
        'backgroundColor' => 'default',
        'textColor' => 'default',
        'textAlignment' => 'left',
    ];

    /**
     * @return string|null
     */
    public static function normalizeDocument(mixed $raw): ?string {
        $parsed = self::parseRaw($raw);
        if ($parsed === null) {
            return null;
        }

        $rootBlocks = self::documentRootToBlocks($parsed);
        if ($rootBlocks === null) {
            if (is_string($parsed) && trim($parsed) !== '') {
                $rootBlocks = [
                    ['type' => 'paragraph', 'content' => trim($parsed)],
                ];
            } else {
                return null;
            }
        }

        if ($rootBlocks === []) {
            return null;
        }

        $normalized = [];
        foreach ($rootBlocks as $block) {
            $n = self::normalizeBlock($block);
            if ($n !== null) {
                $normalized[] = $n;
            }
        }

        if ($normalized === []) {
            return null;
        }

        try {
            $json = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }

        return BlockNoteJson::stripBlockIdsFromDocument($json);
    }

    private static function parseRaw(mixed $raw): mixed {
        if (is_array($raw)) {
            return BlockNoteJson::unwrapRootDocNode($raw);
        }
        if (!is_string($raw)) {
            return null;
        }

        $s = trim(self::stripMarkdownFence($raw));
        if ($s === '') {
            return null;
        }

        if ($s[0] !== '[' && $s[0] !== '{') {
            return $s;
        }

        for ($depth = 0; $depth < 5; $depth++) {
            try {
                $decoded = json_decode($s, true, 512, JSON_THROW_ON_ERROR);
            } catch (Throwable) {
                return $s;
            }
            if (is_string($decoded)) {
                $s = trim($decoded);
                if ($s === '' || ($s[0] !== '[' && $s[0] !== '{')) {
                    return $decoded;
                }
                continue;
            }
            if (is_array($decoded)) {
                return BlockNoteJson::unwrapRootDocNode($decoded);
            }

            return null;
        }

        return null;
    }

    private static function stripMarkdownFence(string $raw): string {
        $s = trim($raw);
        if (!str_starts_with($s, '```')) {
            return $s;
        }
        $s = preg_replace('/^```[a-zA-Z]*\s*/', '', $s) ?? $s;
        $s = preg_replace('/\s*```$/', '', $s) ?? $s;

        return trim($s);
    }

    /**
     * @return list<array<string, mixed>>|null
     */
    private static function documentRootToBlocks(mixed $parsed): ?array {
        if (!is_array($parsed)) {
            return null;
        }
        if (array_is_list($parsed)) {
            return $parsed;
        }
        $type = $parsed['type'] ?? null;
        if (is_string($type) && strtolower($type) === 'doc') {
            return self::coerceDocContentToBlockArray($parsed['content'] ?? null);
        }
        if (is_string($type) && $type !== '') {
            return [$parsed];
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>|null
     */
    private static function coerceDocContentToBlockArray(mixed $content): ?array {
        if (is_array($content) && array_is_list($content)) {
            return $content;
        }
        if (is_array($content) && !array_is_list($content)) {
            $vals = array_values($content);
            if ($vals !== [] && self::allBlocks($vals)) {
                return $vals;
            }
        }

        return null;
    }

    /**
     * @param list<mixed> $vals
     */
    private static function allBlocks(array $vals): bool {
        foreach ($vals as $v) {
            if (!is_array($v) || !isset($v['type']) || !is_string($v['type'])) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function normalizeBlock(mixed $raw): ?array {
        if (!is_array($raw)) {
            return null;
        }
        $typeRaw = $raw['type'] ?? null;
        if (!is_string($typeRaw) || $typeRaw === '') {
            return null;
        }

        $block = $raw;
        $type = $typeRaw === 'blockquote' ? 'quote' : $typeRaw;
        $block['type'] = $type;

        if (!isset($block['children']) || !is_array($block['children'])) {
            $block['children'] = [];
        }

        $prevProps = is_array($block['props'] ?? null) ? $block['props'] : [];

        if (in_array($type, ['paragraph', 'bulletListItem', 'numberedListItem', 'quote'], true)) {
            $block['props'] = array_merge(self::DEFAULT_BLOCK_PROPS, $prevProps);
            $block['content'] = self::normalizeInlineContent($block['content'] ?? null);
        } elseif ($type === 'heading') {
            $level = $prevProps['level'] ?? 1;
            if (!is_numeric($level)) {
                $level = 1;
            }
            $level = max(1, min(6, (int) $level));
            $block['props'] = array_merge(self::DEFAULT_BLOCK_PROPS, $prevProps, ['level' => $level]);
            $block['content'] = self::normalizeInlineContent($block['content'] ?? null);
        } elseif ($type === 'checkListItem') {
            $checked = $prevProps['checked'] ?? false;
            $block['props'] = array_merge(
                self::DEFAULT_BLOCK_PROPS,
                $prevProps,
                ['checked' => (bool) $checked],
            );
            $block['content'] = self::normalizeInlineContent($block['content'] ?? null);
        } elseif ($type === 'table') {
            $block['props'] = array_merge(['textColor' => 'default'], $prevProps);
        } elseif ($type === 'codeBlock') {
            $block['props'] = array_merge(['language' => 'text'], $prevProps);
            if (array_key_exists('content', $block)) {
                $block['content'] = self::normalizeInlineContent($block['content']);
            }
        } elseif ($type === 'divider') {
            $block['props'] = $prevProps;
        } elseif (array_key_exists('content', $block)) {
            $block['content'] = self::normalizeInlineContent($block['content']);
        }

        unset($block['id']);

        $children = [];
        foreach ($block['children'] as $child) {
            $n = self::normalizeBlock($child);
            if ($n !== null) {
                $children[] = $n;
            }
        }
        $block['children'] = $children;

        return $block;
    }

    /**
     *      *
     * @return ''|list<array<string, mixed>>
     */
    private static function normalizeInlineContent(mixed $content): array|string {
        if ($content === null || $content === '') {
            return '';
        }
        if (is_string($content)) {
            $trimmed = trim($content);
            if ($trimmed === '') {
                return '';
            }

            return [['type' => 'text', 'text' => $content, 'styles' => []]];
        }
        if (is_array($content) && isset($content['type']) && is_string($content['type'])) {
            $node = self::normalizeInlineNode($content);

            return $node !== null ? [$node] : '';
        }
        if (is_array($content) && array_is_list($content)) {
            $out = [];
            foreach ($content as $node) {
                $n = self::normalizeInlineNode($node);
                if ($n !== null) {
                    $out[] = $n;
                }
            }

            return $out === [] ? '' : $out;
        }

        return '';
    }

    /**
     * @param array<string, mixed> $node
     * @return array<string, mixed>|null
     */
    private static function normalizeInlineNode(array $node): ?array {
        $type = $node['type'] ?? null;
        if ($type === 'text') {
            $text = $node['text'] ?? '';
            if (!is_string($text)) {
                $text = (string) $text;
            }
            $styles = $node['styles'] ?? [];
            if (!is_array($styles)) {
                $styles = [];
            }

            return ['type' => 'text', 'text' => $text, 'styles' => $styles];
        }
        if ($type === 'link') {
            $href = $node['href'] ?? '';
            if (!is_string($href)) {
                $href = (string) $href;
            }
            $inner = self::normalizeInlineContent($node['content'] ?? '');

            return [
                'type' => 'link',
                'href' => $href,
                'content' => is_array($inner) ? $inner : [],
            ];
        }

        return null;
    }

    /**
     * Gemini may return BlockNote content as a native JSON array or as an escaped JSON string.
     *
     * @return string|null Encoded document string, or null to omit / clear body
     */
    public static function fromModel(mixed $raw): ?string {
        if ($raw === null) {
            return null;
        }

        return self::normalizeDocument($raw);
    }

    /**
     * The model sometimes sends description: "" which would clear the note after normalization; ignore that.
     *
     * @param array<string, mixed> $patch
     */
    public static function dropEmptyBlockNotePatch(array &$patch): void {
        if (!array_key_exists('blockNoteData', $patch)) {
            return;
        }
        $v = $patch['blockNoteData'];
        if ($v === null) {
            return;
        }
        if (is_string($v) && trim($v) === '') {
            unset($patch['blockNoteData']);
        }
    }
}

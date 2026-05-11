<?php

/**
 * Normalizes BlockNote document JSON from imports (e.g. AI): invalid block UUIDs break the editor.
 * Strips only `id` on block-shaped objects (have a string `type`), recursively.
 */
final class BlockNoteJson
{
    /**
     * Models often emit ProseMirror/TipTap roots {"type":"doc","content":[blocks]}.
     * BlockNote stores a top-level JSON array of blocks; unwrap so the editor loads.
     */
    public static function unwrapRootDocNode(mixed $node): mixed {
        if (!is_array($node)) {
            return $node;
        }
        if (array_is_list($node)) {
            return $node;
        }
        $type = $node['type'] ?? null;
        if (!is_string($type) || strtolower($type) !== 'doc') {
            return $node;
        }
        $content = $node['content'] ?? null;
        if (!is_array($content)) {
            return $node;
        }
        // JSON arrays always decode as lists, but some pipelines produce associative arrays.
        if (!array_is_list($content)) {
            $content = array_values($content);
        }

        return $content;
    }

    public static function stripBlockIdsFromDocument(string $json): string {
        $trim = trim($json);
        if (str_starts_with($trim, '```')) {
            $trim = preg_replace('/^```[a-zA-Z]*\s*/', '', $trim) ?? $trim;
            $trim = preg_replace('/\s*```$/', '', $trim) ?? $trim;
            $trim = trim($trim);
        }
        if ($trim === '' || ($trim[0] !== '[' && $trim[0] !== '{')) {
            return $json;
        }

        try {
            $decoded = json_decode($trim, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return $json;
        }

        if (!is_array($decoded)) {
            return $json;
        }

        $decoded = self::unwrapRootDocNode($decoded);
        $stripped = self::stripIdsRecursive($decoded);

        try {
            return json_encode($stripped, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return $json;
        }
    }

    private static function stripIdsRecursive(mixed $node): mixed {
        if (!is_array($node)) {
            return $node;
        }

        if (array_is_list($node)) {
            return array_map(fn ($item) => self::stripIdsRecursive($item), $node);
        }

        if (isset($node['type']) && is_string($node['type']) && $node['type'] !== '') {
            unset($node['id']);
        }

        foreach ($node as $k => $v) {
            $node[$k] = self::stripIdsRecursive($v);
        }

        return $node;
    }
}

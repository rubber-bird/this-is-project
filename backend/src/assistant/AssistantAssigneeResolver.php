<?php

require_once __DIR__ . '/../data/User.php';

final class AssistantAssigneeResolver
{
    /**
     *
     * @param User[] $accountUsers
     * @return array{value: string|null, error: string|null}
     */
    public static function resolve(mixed $raw, array $accountUsers): array {
        if ($raw === null) {
            return ['value' => null, 'error' => null];
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return ['value' => null, 'error' => null];
        }

        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $s)) {
            foreach ($accountUsers as $u) {
                if (strcasecmp($u->id, $s) === 0) {
                    return ['value' => $u->id, 'error' => null];
                }
            }

            return ['value' => null, 'error' => 'Assignee id is not a member of this account'];
        }

        $norm = static function (string $x): string {
            return function_exists('mb_strtolower')
                ? mb_strtolower($x, 'UTF-8')
                : strtolower($x);
        };

        $needle = $norm($s);
        $matches = [];
        foreach ($accountUsers as $u) {
            $full = $norm(trim($u->givenName . ' ' . $u->familyName));
            $given = $norm($u->givenName);
            $family = $norm($u->familyName);
            if ($full === $needle || $given === $needle || $family === $needle) {
                $matches[] = $u;
            }
        }

        if (count($matches) === 1) {
            return ['value' => $matches[0]->id, 'error' => null];
        }
        if (count($matches) === 0) {
            return ['value' => null, 'error' => 'Could not match assignee to a team member'];
        }

        return ['value' => null, 'error' => 'Multiple team members match that name; use full name or user id'];
    }
}

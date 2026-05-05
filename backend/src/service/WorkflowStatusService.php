<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/WorkflowStatusRepository.php';
require_once __DIR__ . '/../data/WorkflowStatus.php';
require_once __DIR__ . '/../data/TaskRepository.php';

class WorkflowStatusService
{
    private const NAME_MAX = 100;
    private const COLOR_PATTERN = '/^#[0-9a-f]{6}$/i';

    public function __construct(
        private readonly UserRepository $users,
        private readonly ProjectRepository $projects,
        private readonly WorkflowStatusRepository $statuses,
        private readonly TaskRepository $tasks,
    ) {}

    public function list(?string $userId, string $projectId): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        $list = $this->statuses->findByProjectId($projectId);
        $out = array_map(fn (WorkflowStatus $s) => $s->toPublicArray(), $list);

        return Result::ok(200, $out);
    }

    /** @param mixed $statusesInput expected array of {name, color?} */
    public function createMany(?string $userId, string $projectId, mixed $statusesInput): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        if (!is_array($statusesInput) || array_is_list($statusesInput) === false) {
            return Result::fail(400, 'validation', ['message' => 'statuses must be a list']);
        }
        if (count($statusesInput) === 0) {
            return Result::fail(400, 'validation', ['message' => 'At least one status is required']);
        }

        $validated = [];
        $seenNames = [];
        foreach ($statusesInput as $index => $raw) {
            if (!is_array($raw)) {
                return Result::fail(400, 'validation', ['message' => "Status at position {$index} must be an object"]);
            }

            $trimName = trim((string) ($raw['name'] ?? ''));
            if ($trimName === '') {
                return Result::fail(400, 'validation', ['message' => "Name is required at position {$index}"]);
            }
            if (strlen($trimName) > self::NAME_MAX) {
                return Result::fail(400, 'validation', ['message' => "Name at position {$index} must be at most " . self::NAME_MAX . ' characters']);
            }

            $lowerName = strtolower($trimName);
            if (isset($seenNames[$lowerName])) {
                return Result::fail(400, 'validation', ['message' => "Duplicate status name: {$trimName}"]);
            }
            $seenNames[$lowerName] = true;

            $color = $this->normalizeColor($raw['color'] ?? null);
            if ($color === false) {
                return Result::fail(400, 'validation', ['message' => "Color at position {$index} must be a hex code like #RRGGBB"]);
            }

            if ($this->statuses->findByProjectIdAndName($projectId, $trimName)->hasValue()) {
                return Result::fail(409, 'conflict', ['message' => "A status named \"{$trimName}\" already exists"]);
            }

            $validated[] = ['name' => $trimName, 'color' => $color];
        }

        $basePosition = $this->statuses->nextPosition($projectId);

        $pdo = Database::get();
        $pdo->beginTransaction();
        try {
            $saved = [];
            foreach ($validated as $i => $row) {
                $saved[] = $this->statuses->save(new WorkflowStatus(
                    id: null,
                    projectId: $projectId,
                    name: $row['name'],
                    color: $row['color'],
                    position: $basePosition + $i,
                ));
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return Result::ok(201, array_map(fn (WorkflowStatus $s) => $s->toPublicArray(), $saved));
    }

    /** @param array<string, mixed> $patch */
    public function update(?string $userId, string $projectId, string $statusId, array $patch): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        $existingMaybe = $this->statuses->findByIdAndProjectId($statusId, $projectId);
        if (!$existingMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Status not found']);
        }
        $existing = $existingMaybe->value();

        $hasName  = array_key_exists('name', $patch);
        $hasColor = array_key_exists('color', $patch);
        if (!$hasName && !$hasColor) {
            return Result::fail(400, 'validation', ['message' => 'Nothing to update']);
        }

        $newName = $hasName ? trim((string) $patch['name']) : $existing->name;
        if ($newName === '') {
            return Result::fail(400, 'validation', ['message' => 'Name cannot be empty']);
        }
        if (strlen($newName) > self::NAME_MAX) {
            return Result::fail(400, 'validation', ['message' => 'Name must be at most ' . self::NAME_MAX . ' characters']);
        }

        if ($hasColor) {
            $newColor = $this->normalizeColor($patch['color']);
            if ($newColor === false) {
                return Result::fail(400, 'validation', ['message' => 'Color must be a hex code like #RRGGBB']);
            }
        } else {
            $newColor = $existing->color;
        }

        if (strcasecmp($newName, $existing->name) !== 0) {
            $conflict = $this->statuses->findByProjectIdAndName($projectId, $newName);
            if ($conflict->hasValue() && $conflict->value()->id !== $existing->id) {
                return Result::fail(409, 'conflict', ['message' => "A status named \"{$newName}\" already exists"]);
            }
        }

        $this->statuses->update($existing->id, $projectId, $newName, $newColor);

        $updated = $this->statuses->findByIdAndProjectId($existing->id, $projectId)->value();

        return Result::ok(200, $updated->toPublicArray());
    }

    public function delete(?string $userId, string $projectId, string $statusId): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        $all = $this->statuses->findByProjectId($projectId);
        if (count($all) <= 1) {
            return Result::fail(400, 'validation', ['message' => 'Cannot delete the last status']);
        }

        $target = null;
        foreach ($all as $s) {
            if ($s->id === $statusId) {
                $target = $s;
                break;
            }
        }
        if ($target === null) {
            return Result::fail(404, 'not_found', ['message' => 'Status not found']);
        }

        $remaining = array_values(array_filter($all, fn (WorkflowStatus $s) => $s->id !== $statusId));
        $fallback = $remaining[0];

        $changes = [];
        foreach ($remaining as $i => $s) {
            if ($s->position !== $i) {
                $changes[$s->id] = $i;
            }
        }

        $pdo = Database::get();
        $pdo->beginTransaction();
        try {
            $this->tasks->reassignByStatus($projectId, $target->id, $fallback->id);
            $this->statuses->delete($target->id, $projectId);
            if (count($changes) > 0) {
                $stmt = $pdo->prepare(
                    'UPDATE workflow_statuses SET position = ? WHERE id = ? AND project_id = ?'
                );
                $i = 0;
                foreach (array_keys($changes) as $id) {
                    $stmt->execute([-1 - $i, $id, $projectId]);
                    $i++;
                }
                foreach ($changes as $id => $pos) {
                    $stmt->execute([$pos, $id, $projectId]);
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $updated = $this->statuses->findByProjectId($projectId);
        $out = array_map(fn (WorkflowStatus $s) => $s->toPublicArray(), $updated);

        return Result::ok(200, $out);
    }

    public function reorder(?string $userId, string $projectId, mixed $orderInput): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        if (!is_array($orderInput) || array_is_list($orderInput) === false) {
            return Result::fail(400, 'validation', ['message' => 'order must be a list of status ids']);
        }

        $existing = $this->statuses->findByProjectId($projectId);
        if (count($orderInput) !== count($existing)) {
            return Result::fail(400, 'validation', ['message' => 'order must include every status exactly once']);
        }

        $existingIds = [];
        foreach ($existing as $s) {
            $existingIds[$s->id] = true;
        }

        $seen = [];
        foreach ($orderInput as $index => $id) {
            if (!is_string($id) || $id === '') {
                return Result::fail(400, 'validation', ['message' => "order[{$index}] must be a string id"]);
            }
            if (isset($seen[$id])) {
                return Result::fail(400, 'validation', ['message' => "Duplicate id at position {$index}"]);
            }
            if (!isset($existingIds[$id])) {
                return Result::fail(400, 'validation', ['message' => "Unknown status id: {$id}"]);
            }
            $seen[$id] = true;
        }

        $currentPositions = [];
        foreach ($existing as $s) {
            $currentPositions[$s->id] = $s->position;
        }

        $changes = [];
        foreach ($orderInput as $index => $id) {
            if ($currentPositions[$id] !== $index) {
                $changes[$id] = $index;
            }
        }

        if (count($changes) === 0) {
            $out = array_map(fn (WorkflowStatus $s) => $s->toPublicArray(), $existing);
            return Result::ok(200, $out);
        }

        $this->statuses->updatePositions($projectId, $changes);

        $updated = $this->statuses->findByProjectId($projectId);
        $out = array_map(fn (WorkflowStatus $s) => $s->toPublicArray(), $updated);

        return Result::ok(200, $out);
    }

    private function requireProject(?string $userId, string $projectId): Result {
        if (!$userId) {
            return Result::fail(401, 'unauthorized', ['message' => 'Not authenticated']);
        }

        $userMaybe = $this->users->findById($userId);
        if (!$userMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'User not found']);
        }
        $user = $userMaybe->value();

        $projectMaybe = $this->projects->findByIdAndAccountId($projectId, $user->accountId);
        if (!$projectMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Project not found']);
        }

        return Result::ok(200, $projectMaybe->value());
    }

    /** @return string|null|false null means no color, false means invalid */
    private function normalizeColor(mixed $color): string|null|false {
        if ($color === null) {
            return null;
        }
        $s = trim((string) $color);
        if ($s === '') {
            return null;
        }
        if (!preg_match(self::COLOR_PATTERN, $s)) {
            return false;
        }
        return strtolower($s);
    }
}

<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/WorkflowStatusRepository.php';
require_once __DIR__ . '/../data/WorkflowStatus.php';

class WorkflowStatusService
{
    private const NAME_MAX = 100;
    private const COLOR_PATTERN = '/^#[0-9a-f]{6}$/i';

    public function __construct(
        private readonly UserRepository $users,
        private readonly ProjectRepository $projects,
        private readonly WorkflowStatusRepository $statuses,
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

<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/WorkflowStatusRepository.php';
require_once __DIR__ . '/../data/TaskRepository.php';
require_once __DIR__ . '/../data/Task.php';

class TaskService
{
    private const TITLE_MAX = 255;
    private const DESCRIPTION_MAX = 65535;

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

        $list = $this->tasks->findByProjectId($projectId);
        $out = array_map(fn (Task $t) => $t->toPublicArray(), $list);

        return Result::ok(200, $out);
    }

    public function get(?string $userId, string $projectId, string $taskId): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        $maybe = $this->tasks->findByIdAndProjectId($taskId, $projectId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Task not found']);
        }

        return Result::ok(200, $maybe->value()->toPublicArray());
    }

    public function create(?string $userId, string $projectId, mixed $title, mixed $description): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }
        $user = $projectResult->value()['user'];

        $trimTitle = trim((string) $title);
        if ($trimTitle === '') {
            return Result::fail(400, 'validation', ['message' => 'Title is required']);
        }
        if (strlen($trimTitle) > self::TITLE_MAX) {
            return Result::fail(400, 'validation', ['message' => 'Title must be at most ' . self::TITLE_MAX . ' characters']);
        }

        $desc = $this->normalizeDescription($description);
        if ($desc !== null && strlen($desc) > self::DESCRIPTION_MAX) {
            return Result::fail(400, 'validation', ['message' => 'Description is too long']);
        }

        $firstStatus = $this->statuses->findFirstByProjectId($projectId);
        if (!$firstStatus->hasValue()) {
            return Result::fail(400, 'validation', ['message' => 'Project has no workflow statuses']);
        }

        $task = $this->tasks->save(new Task(
            id: null,
            projectId: $projectId,
            workflowStatusId: $firstStatus->value()->id,
            title: $trimTitle,
            description: $desc,
            createdBy: $user->id,
        ));

        return Result::ok(201, $task->toPublicArray());
    }

    /** @param array<string, mixed> $patch */
    public function update(?string $userId, string $projectId, string $taskId, array $patch): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        $maybe = $this->tasks->findByIdAndProjectId($taskId, $projectId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Task not found']);
        }

        $fields = [];

        if (array_key_exists('title', $patch)) {
            $trimTitle = trim((string) $patch['title']);
            if ($trimTitle === '') {
                return Result::fail(400, 'validation', ['message' => 'Title cannot be empty']);
            }
            if (strlen($trimTitle) > self::TITLE_MAX) {
                return Result::fail(400, 'validation', ['message' => 'Title must be at most ' . self::TITLE_MAX . ' characters']);
            }
            $fields['title'] = $trimTitle;
        }

        if (array_key_exists('description', $patch)) {
            $desc = $this->normalizeDescription($patch['description']);
            if ($desc !== null && strlen($desc) > self::DESCRIPTION_MAX) {
                return Result::fail(400, 'validation', ['message' => 'Description is too long']);
            }
            $fields['description'] = $desc;
        }

        if (array_key_exists('workflow_status_id', $patch)) {
            $wsId = trim((string) $patch['workflow_status_id']);
            if ($wsId === '') {
                return Result::fail(400, 'validation', ['message' => 'workflow_status_id is required when provided']);
            }
            $wsMaybe = $this->statuses->findByIdAndProjectId($wsId, $projectId);
            if (!$wsMaybe->hasValue()) {
                return Result::fail(400, 'validation', ['message' => 'Invalid workflow status for this project']);
            }
            $fields['workflow_status_id'] = $wsId;
        }

        if ($fields === []) {
            return Result::fail(400, 'validation', ['message' => 'No valid fields to update']);
        }

        $updated = $this->tasks->update($taskId, $projectId, $fields);

        return Result::ok(200, $updated->toPublicArray());
    }

    /** @return Result value: ['user' => User, 'project' => Project] */
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

        return Result::ok(200, ['user' => $user, 'project' => $projectMaybe->value()]);
    }

    private function normalizeDescription(mixed $description): ?string {
        if ($description === null) {
            return null;
        }
        $s = trim((string) $description);

        return $s === '' ? null : $s;
    }
}

<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/WorkflowStatusRepository.php';
require_once __DIR__ . '/../data/TaskRepository.php';
require_once __DIR__ . '/../data/Task.php';
require_once __DIR__ . '/../util/BlockNoteJson.php';

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

    public function create(?string $userId, string $projectId, mixed $title, mixed $blockNoteData, mixed $deadline = null, mixed $priority = null): Result {
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

        $desc = $this->normalizeDescription($blockNoteData);
        if ($desc !== null && strlen($desc) > self::DESCRIPTION_MAX) {
            return Result::fail(400, 'validation', ['message' => 'Description is too long']);
        }

        $deadlineNorm = $this->normalizeDeadline($deadline);
        if ($deadlineNorm === false) {
            return Result::fail(400, 'validation', ['message' => 'Deadline must be YYYY-MM-DD']);
        }

        $priorityNorm = $this->normalizePriority($priority);
        if ($priorityNorm === false) {
            return Result::fail(400, 'validation', ['message' => 'priority must be low, medium, or high']);
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
            blockNoteData: $desc,
            createdBy: $user->id,
            deadline: $deadlineNorm,
            priority: $priorityNorm,
        ));

        return Result::ok(201, $task->toPublicArray());
    }

    /** @param array<string, mixed> $patch */
    public function update(?string $userId, string $projectId, string $taskId, array $patch): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }
        $project = $projectResult->value()['project'];

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

        if (array_key_exists('blockNoteData', $patch)) {
            $desc = $this->normalizeDescription($patch['blockNoteData']);
            if ($desc !== null && strlen($desc) > self::DESCRIPTION_MAX) {
                return Result::fail(400, 'validation', ['message' => 'Description is too long']);
            }
            $fields['blockNoteData'] = $desc;
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

        if (array_key_exists('assigned_to', $patch)) {
            $rawAssignee = $patch['assigned_to'];
            if ($rawAssignee === null || $rawAssignee === '') {
                $fields['assigned_to'] = null;
            } else {
                $assigneeId = trim((string) $rawAssignee);
                $assigneeMaybe = $this->users->findById($assigneeId);
                if (!$assigneeMaybe->hasValue() || $assigneeMaybe->value()->accountId !== $project->accountId) {
                    return Result::fail(400, 'validation', ['message' => 'Invalid assignee for this project']);
                }
                $fields['assigned_to'] = $assigneeId;
            }
        }

        if (array_key_exists('deadline', $patch)) {
            $deadlineNorm = $this->normalizeDeadline($patch['deadline']);
            if ($deadlineNorm === false) {
                return Result::fail(400, 'validation', ['message' => 'Deadline must be YYYY-MM-DD']);
            }
            $fields['deadline'] = $deadlineNorm;
        }

        if (array_key_exists('priority', $patch)) {
            $priorityNorm = $this->normalizePriority($patch['priority']);
            if ($priorityNorm === false) {
                return Result::fail(400, 'validation', ['message' => 'priority must be low, medium, or high']);
            }
            $fields['priority'] = $priorityNorm;
        }

        if ($fields === []) {
            return Result::fail(400, 'validation', ['message' => 'No valid fields to update']);
        }

        $updated = $this->tasks->update($taskId, $projectId, $fields);

        return Result::ok(200, $updated->toPublicArray());
    }

    public function delete(?string $userId, string $projectId, string $taskId): Result {
        $projectResult = $this->requireProject($userId, $projectId);
        if ($projectResult->failed()) {
            return $projectResult;
        }

        $maybe = $this->tasks->findByIdAndProjectId($taskId, $projectId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Task not found']);
        }

        $this->tasks->delete($taskId, $projectId);

        return Result::ok(200, ['message' => 'Deleted']);
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
        if (is_array($description)) {
            try {
                $description = json_encode($description, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            } catch (Throwable) {
                return null;
            }
        }
        $s = trim((string) $description);
        if ($s !== '' && ($s[0] === '[' || $s[0] === '{')) {
            $s = BlockNoteJson::stripBlockIdsFromDocument($s);
        }

        return $s === '' ? null : $s;
    }

    /** @return string|null|false null = no date; false = invalid */
    private function normalizeDeadline(mixed $deadline): string|null|false {
        if ($deadline === null) {
            return null;
        }
        $s = trim((string) $deadline);
        if ($s === '') {
            return null;
        }
        $dt = DateTime::createFromFormat('Y-m-d', $s);

        return $dt && $dt->format('Y-m-d') === $s ? $s : false;
    }

    /** @return string|false normalized slug or false if invalid */
    private function normalizePriority(mixed $priority): string|false {
        if ($priority === null || $priority === '') {
            return 'medium';
        }
        $s = strtolower(trim((string) $priority));

        return in_array($s, ['low', 'medium', 'high'], true) ? $s : false;
    }
}

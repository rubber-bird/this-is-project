<?php

require_once __DIR__ . '/../data/User.php';
require_once __DIR__ . '/../service/TaskService.php';
require_once __DIR__ . '/AssistantAssigneeResolver.php';
require_once __DIR__ . '/../util/BlockNoteImportNormalizer.php';

final class AssistantActionExecutor
{
    public function __construct(
        private readonly TaskService $taskService,
    ) {}

    /**
     * @param array<string, mixed> $action
     * @param User[] $accountUsers
     * @return array{ok: bool, detail: string}
     */
    public function run(?string $userId, string $projectId, array $action, array $accountUsers): array {
        $type = strtolower(trim((string) ($action['type'] ?? '')));

        return match ($type) {
            'create_task' => $this->createTask($userId, $projectId, $action, $accountUsers),
            'update_task' => $this->updateTask($userId, $projectId, $action, $accountUsers),
            'delete_task' => $this->deleteTask($userId, $projectId, $action),
            default => ['ok' => false, 'detail' => 'Unsupported action type: ' . $type],
        };
    }

    /**
     * @param array<string, mixed> $action
     * @param User[] $accountUsers
     * @return array{ok: bool, detail: string}
     */
    private function createTask(?string $userId, string $projectId, array $action, array $accountUsers): array {
        $title = (string) ($action['title'] ?? '');
        $description = array_key_exists('description', $action)
            ? BlockNoteImportNormalizer::fromModel($action['description'])
            : null;
        $deadline = isset($action['deadline']) ? (string) $action['deadline'] : null;
        $priority = isset($action['priority']) ? (string) $action['priority'] : null;
        $statusId = isset($action['workflow_status_id']) ? (string) $action['workflow_status_id'] : null;
        $hasAssignedTo = array_key_exists('assigned_to', $action);
        $assignedTo = null;

        if ($hasAssignedTo) {
            $resolved = AssistantAssigneeResolver::resolve($action['assigned_to'], $accountUsers);
            if ($resolved['error'] !== null) {
                return ['ok' => false, 'detail' => $resolved['error']];
            }
            $assignedTo = $resolved['value'];
        }

        $created = $this->taskService->create(
            $userId,
            $projectId,
            $title,
            $description,
            $deadline,
            $priority,
        );
        if ($created->failed()) {
            return ['ok' => false, 'detail' => 'Create task failed: ' . ($created->body()['message'] ?? 'Unknown error')];
        }

        $createdTask = $created->value();
        $taskId = (string) ($createdTask['id'] ?? '');
        if ($taskId === '') {
            return ['ok' => false, 'detail' => 'Create task failed: missing task id'];
        }

        if ($statusId !== null || $hasAssignedTo) {
            $patch = [];
            if ($statusId !== null && $statusId !== '') {
                $patch['workflow_status_id'] = $statusId;
            }
            if ($hasAssignedTo) {
                $patch['assigned_to'] = $assignedTo;
            }
            if ($patch !== []) {
                $updated = $this->taskService->update($userId, $projectId, $taskId, $patch);
                if ($updated->failed()) {
                    return [
                        'ok' => false,
                        'detail' => 'Create task follow-up update failed: ' . ($updated->body()['message'] ?? 'Unknown error'),
                    ];
                }
            }
        }

        return ['ok' => true, 'detail' => 'Created task "' . ((string) ($createdTask['title'] ?? $title)) . '"'];
    }

    /**
     * @param array<string, mixed> $action
     * @param User[] $accountUsers
     * @return array{ok: bool, detail: string}
     */
    private function updateTask(?string $userId, string $projectId, array $action, array $accountUsers): array {
        $taskId = trim((string) ($action['task_id'] ?? ''));
        if ($taskId === '') {
            return ['ok' => false, 'detail' => 'Update task failed: task_id is required'];
        }

        $patch = [];
        foreach (['title', 'workflow_status_id', 'deadline', 'priority'] as $field) {
            if (array_key_exists($field, $action)) {
                $patch[$field] = $action[$field];
            }
        }
        $noteError = $this->applyNoteToPatch($patch, $action);
        if ($noteError !== null) {
            return ['ok' => false, 'detail' => $noteError];
        }
        if (array_key_exists('assigned_to', $action)) {
            $resolved = AssistantAssigneeResolver::resolve($action['assigned_to'], $accountUsers);
            if ($resolved['error'] !== null) {
                return ['ok' => false, 'detail' => $resolved['error']];
            }
            $patch['assigned_to'] = $resolved['value'];
        }

        BlockNoteImportNormalizer::dropEmptyBlockNotePatch($patch);

        $updated = $this->taskService->update($userId, $projectId, $taskId, $patch);
        if ($updated->failed()) {
            return ['ok' => false, 'detail' => 'Update task failed: ' . ($updated->body()['message'] ?? 'Unknown error')];
        }

        $task = $updated->value();

        return ['ok' => true, 'detail' => 'Updated task "' . ((string) ($task['title'] ?? $taskId)) . '"'];
    }

    /**
     * @param array<string, mixed> $action
     * @return array{ok: bool, detail: string}
     */
    private function deleteTask(?string $userId, string $projectId, array $action): array {
        $taskId = trim((string) ($action['task_id'] ?? ''));
        if ($taskId === '') {
            return ['ok' => false, 'detail' => 'Delete task failed: task_id is required'];
        }

        $deleted = $this->taskService->delete($userId, $projectId, $taskId);
        if ($deleted->failed()) {
            return ['ok' => false, 'detail' => 'Delete task failed: ' . ($deleted->body()['message'] ?? 'Unknown error')];
        }

        return ['ok' => true, 'detail' => 'Deleted task ' . $taskId];
    }

    /**
     * @param array<string, mixed> $patch
     * @param array<string, mixed> $action
     */
    private function applyNoteToPatch(array &$patch, array $action): ?string {
        $raw = null;
        if (array_key_exists('description', $action)) {
            $raw = $action['description'];
        } elseif (array_key_exists('blockNoteData', $action)) {
            $raw = $action['blockNoteData'];
        } else {
            return null;
        }

        if ($raw === null) {
            $patch['blockNoteData'] = null;

            return null;
        }

        if (is_string($raw) && trim($raw) === '') {
            return null;
        }

        $normalized = BlockNoteImportNormalizer::fromModel($raw);
        if ($normalized === null) {
            return 'Update task failed: could not normalize task description';
        }

        $patch['blockNoteData'] = $normalized;

        return null;
    }
}

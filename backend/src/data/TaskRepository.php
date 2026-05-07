<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/Task.php';

class TaskRepository
{
    private const SELECT_BASE = <<<'SQL'
        SELECT id, project_id, workflow_status_id, title, description, created_by,
               assigned_to, deadline, priority, created_at, updated_at
        FROM tasks
        SQL;

    /** @return Task[] */
    public function findByProjectId(string $projectId): array {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE project_id = ? ORDER BY created_at ASC');
        $stmt->execute([$projectId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn (array $row) => $this->hydrate($row), $rows);
    }

    public function findByIdAndProjectId(string $id, string $projectId): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE id = ? AND project_id = ?');
        $stmt->execute([$id, $projectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function save(Task $task): Task {
        $id = $task->id ?? Uuid::generate();

        $sql = 'INSERT INTO tasks (
            id, project_id, workflow_status_id, title, description, created_by,
            assigned_to, deadline, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        $stmt = Database::get()->prepare($sql);
        $stmt->execute([
            $id,
            $task->projectId,
            $task->workflowStatusId,
            $task->title,
            $task->blockNoteData,
            $task->createdBy,
            $task->assignedTo,
            $task->deadline,
            $task->priority,
        ]);

        return $this->findByIdAndProjectId($id, $task->projectId)->value();
    }

    /**
     * @param array{title?: string, blockNoteData?: string|null, workflow_status_id?: string, assigned_to?: string|null, deadline?: string|null, priority?: string} $fields
     */
    public function update(string $id, string $projectId, array $fields): Task {
        $columnMap = [
            'title' => 'title',
            'blockNoteData' => 'description',
            'workflow_status_id' => 'workflow_status_id',
            'assigned_to' => 'assigned_to',
            'deadline' => 'deadline',
            'priority' => 'priority',
        ];

        $sets = [];
        $params = [];
        foreach ($columnMap as $key => $column) {
            if (!array_key_exists($key, $fields)) {
                continue;
            }
            $sets[] = "{$column} = ?";
            $params[] = $fields[$key];
        }

        if ($sets === []) {
            $maybe = $this->findByIdAndProjectId($id, $projectId);
            if (!$maybe->hasValue()) {
                throw new RuntimeException('Task not found');
            }

            return $maybe->value();
        }

        $params[] = $id;
        $params[] = $projectId;

        $sql = 'UPDATE tasks SET ' . implode(', ', $sets) . ' WHERE id = ? AND project_id = ?';
        $stmt = Database::get()->prepare($sql);
        $stmt->execute($params);

        return $this->findByIdAndProjectId($id, $projectId)->value();
    }

    public function reassignByStatus(string $projectId, string $fromStatusId, string $toStatusId): void {
        $stmt = Database::get()->prepare(
            'UPDATE tasks SET workflow_status_id = ? WHERE project_id = ? AND workflow_status_id = ?'
        );
        $stmt->execute([$toStatusId, $projectId, $fromStatusId]);
    }

    private function hydrate(array $row): Task {
        return new Task(
            id: $row['id'],
            projectId: $row['project_id'],
            workflowStatusId: $row['workflow_status_id'],
            title: $row['title'],
            blockNoteData: $row['description'],
            createdBy: $row['created_by'],
            assignedTo: $row['assigned_to'] ?? null,
            deadline: $row['deadline'] ?? null,
            priority: isset($row['priority']) ? (string) $row['priority'] : 'medium',
            createdAt: $row['created_at'] ?? null,
            updatedAt: $row['updated_at'] ?? null,
        );
    }
}

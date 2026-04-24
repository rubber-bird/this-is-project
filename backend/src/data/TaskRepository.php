<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/Task.php';

class TaskRepository
{
    private const SELECT_BASE = 'SELECT id, project_id, workflow_status_id, title, description, created_by, created_at, updated_at FROM tasks';

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

        $stmt = Database::get()->prepare(
            'INSERT INTO tasks (id, project_id, workflow_status_id, title, description, created_by) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $task->projectId,
            $task->workflowStatusId,
            $task->title,
            $task->description,
            $task->createdBy,
        ]);

        return $this->findByIdAndProjectId($id, $task->projectId)->value();
    }

    private function hydrate(array $row): Task {
        return new Task(
            id: $row['id'],
            projectId: $row['project_id'],
            workflowStatusId: $row['workflow_status_id'],
            title: $row['title'],
            description: $row['description'],
            createdBy: $row['created_by'],
            createdAt: $row['created_at'] ?? null,
            updatedAt: $row['updated_at'] ?? null,
        );
    }
}

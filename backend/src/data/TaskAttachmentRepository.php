<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/TaskAttachment.php';

class TaskAttachmentRepository
{
    private const SELECT_BASE = <<<'SQL'
        SELECT id, task_id, project_id, original_filename, stored_name, mime_type,
               size_bytes, uploaded_by, created_at
        FROM task_attachments
        SQL;

    /** @return TaskAttachment[] */
    public function findByTaskId(string $taskId, string $projectId): array {
        $stmt = Database::get()->prepare(
            self::SELECT_BASE . ' WHERE task_id = ? AND project_id = ? ORDER BY created_at ASC'
        );
        $stmt->execute([$taskId, $projectId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn (array $row) => $this->hydrate($row), $rows);
    }

    public function findById(string $id, string $taskId, string $projectId): Maybe {
        $stmt = Database::get()->prepare(
            self::SELECT_BASE . ' WHERE id = ? AND task_id = ? AND project_id = ?'
        );
        $stmt->execute([$id, $taskId, $projectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function save(TaskAttachment $attachment): TaskAttachment {
        $id = $attachment->id ?: Uuid::generate();

        $sql = 'INSERT INTO task_attachments (
            id, task_id, project_id, original_filename, stored_name, mime_type,
            size_bytes, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        $stmt = Database::get()->prepare($sql);
        $stmt->execute([
            $id,
            $attachment->taskId,
            $attachment->projectId,
            $attachment->originalFilename,
            $attachment->storedName,
            $attachment->mimeType,
            $attachment->sizeBytes,
            $attachment->uploadedBy,
        ]);

        return $this->findById($id, $attachment->taskId, $attachment->projectId)->value();
    }

    public function delete(string $id, string $taskId, string $projectId): void {
        $stmt = Database::get()->prepare(
            'DELETE FROM task_attachments WHERE id = ? AND task_id = ? AND project_id = ?'
        );
        $stmt->execute([$id, $taskId, $projectId]);
    }

    public function deleteByTaskId(string $taskId, string $projectId): void {
        $stmt = Database::get()->prepare(
            'DELETE FROM task_attachments WHERE task_id = ? AND project_id = ?'
        );
        $stmt->execute([$taskId, $projectId]);
    }

    private function hydrate(array $row): TaskAttachment {
        return new TaskAttachment(
            id: $row['id'],
            taskId: $row['task_id'],
            projectId: $row['project_id'],
            originalFilename: $row['original_filename'],
            storedName: $row['stored_name'],
            mimeType: $row['mime_type'] ?? null,
            sizeBytes: (int) $row['size_bytes'],
            uploadedBy: $row['uploaded_by'] ?? null,
            createdAt: $row['created_at'] ?? null,
        );
    }
}

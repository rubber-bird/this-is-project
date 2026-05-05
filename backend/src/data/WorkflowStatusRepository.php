<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/WorkflowStatus.php';

class WorkflowStatusRepository
{
    private const SELECT_BASE = 'SELECT id, project_id, name, color, position, created_at, updated_at FROM workflow_statuses';

    /** @return WorkflowStatus[] */
    public function findByProjectId(string $projectId): array {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE project_id = ? ORDER BY position ASC');
        $stmt->execute([$projectId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn (array $row) => $this->hydrate($row), $rows);
    }

    public function findByProjectIdAndName(string $projectId, string $name): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE project_id = ? AND name = ?');
        $stmt->execute([$projectId, $name]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function findByIdAndProjectId(string $id, string $projectId): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE id = ? AND project_id = ?');
        $stmt->execute([$id, $projectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function findFirstByProjectId(string $projectId): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE project_id = ? ORDER BY position ASC LIMIT 1');
        $stmt->execute([$projectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function nextPosition(string $projectId): int {
        $stmt = Database::get()->prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM workflow_statuses WHERE project_id = ?');
        $stmt->execute([$projectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) $row['next'];
    }

    public function save(WorkflowStatus $status): WorkflowStatus {
        $id = $status->id ?? Uuid::generate();

        $stmt = Database::get()->prepare(
            'INSERT INTO workflow_statuses (id, project_id, name, color, position) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $status->projectId,
            $status->name,
            $status->color,
            $status->position,
        ]);

        return $this->findByIdAndProjectId($id, $status->projectId)->value();
    }

    public function update(string $id, string $projectId, string $name, ?string $color): void {
        $stmt = Database::get()->prepare(
            'UPDATE workflow_statuses SET name = ?, color = ? WHERE id = ? AND project_id = ?'
        );
        $stmt->execute([$name, $color, $id, $projectId]);
    }

    public function delete(string $id, string $projectId): void {
        $stmt = Database::get()->prepare(
            'DELETE FROM workflow_statuses WHERE id = ? AND project_id = ?'
        );
        $stmt->execute([$id, $projectId]);
    }

    /** @param array<string, int> $changes map of id => new position */
    public function updatePositions(string $projectId, array $changes): void {
        if (empty($changes)) {
            return;
        }

        // Two-pass update to dodge uq_ws_project_position during cycles (e.g. swaps):
        // shift every changing row to a distinct negative, then set finals.
        $pdo = Database::get();
        $pdo->beginTransaction();
        try {
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
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private function hydrate(array $row): WorkflowStatus {
        return new WorkflowStatus(
            id: $row['id'],
            projectId: $row['project_id'],
            name: $row['name'],
            color: $row['color'],
            position: (int) $row['position'],
            createdAt: $row['created_at'] ?? null,
            updatedAt: $row['updated_at'] ?? null,
        );
    }
}

<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/Project.php';

class ProjectRepository
{
    private const SELECT_BASE = 'SELECT id, account_id, name, description, created_by, created_at, updated_at FROM projects';

    /** @return Project[] */
    public function findByAccountId(string $accountId): array {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE account_id = ? ORDER BY name ASC');
        $stmt->execute([$accountId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn (array $row) => $this->hydrate($row), $rows);
    }

    public function countByAccountId(string $accountId): int {
        $stmt = Database::get()->prepare('SELECT COUNT(*) FROM projects WHERE account_id = ?');
        $stmt->execute([$accountId]);

        return (int) $stmt->fetchColumn();
    }

    public function findByIdAndAccountId(string $id, string $accountId): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE id = ? AND account_id = ?');
        $stmt->execute([$id, $accountId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function findByAccountIdAndName(string $accountId, string $name, ?string $excludeId = null): Maybe {
        if ($excludeId !== null) {
            $stmt = Database::get()->prepare(
                self::SELECT_BASE . ' WHERE account_id = ? AND name = ? AND id != ?'
            );
            $stmt->execute([$accountId, $name, $excludeId]);
        } else {
            $stmt = Database::get()->prepare(
                self::SELECT_BASE . ' WHERE account_id = ? AND name = ?'
            );
            $stmt->execute([$accountId, $name]);
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function save(Project $project): Project {
        $id = $project->id ?? Uuid::generate();

        $stmt = Database::get()->prepare(
            'INSERT INTO projects (id, account_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $project->accountId,
            $project->name,
            $project->description,
            $project->createdBy,
        ]);

        return $this->findByIdAndAccountId($id, $project->accountId)->value();
    }

    public function update(string $id, string $accountId, string $name, ?string $description): void {
        $stmt = Database::get()->prepare(
            'UPDATE projects SET name = ?, description = ? WHERE id = ? AND account_id = ?'
        );
        $stmt->execute([$name, $description, $id, $accountId]);
    }

    public function delete(string $id, string $accountId): void {
        $stmt = Database::get()->prepare('DELETE FROM projects WHERE id = ? AND account_id = ?');
        $stmt->execute([$id, $accountId]);
    }

    private function hydrate(array $row): Project {
        return new Project(
            id:          $row['id'],
            accountId:   $row['account_id'],
            name:        $row['name'],
            description: $row['description'],
            createdBy:   $row['created_by'],
            createdAt:   $row['created_at'] ?? null,
            updatedAt:   $row['updated_at'] ?? null,
        );
    }
}

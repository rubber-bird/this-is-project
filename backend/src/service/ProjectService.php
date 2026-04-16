<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/Project.php';

class ProjectService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly ProjectRepository $projects,
    ) {}

    public function list(?string $userId): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $user = $userResult->value();

        $list = $this->projects->findByAccountId($user->accountId);
        $out  = array_map(fn (Project $p) => $p->toPublicArray(), $list);

        return Result::ok(200, $out);
    }

    public function get(?string $userId, string $projectId): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $user = $userResult->value();

        $maybe = $this->projects->findByIdAndAccountId($projectId, $user->accountId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Project not found']);
        }

        return Result::ok(200, $maybe->value()->toPublicArray());
    }

    public function create(?string $userId, string $name, mixed $description): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $user = $userResult->value();

        $trimName = trim($name);
        if ($trimName === '') {
            return Result::fail(400, 'validation', ['message' => 'Name is required']);
        }
        if (strlen($trimName) > 255) {
            return Result::fail(400, 'validation', ['message' => 'Name must be at most 255 characters']);
        }

        $desc = $this->normalizeDescription($description);
        if ($desc !== null && strlen($desc) > 65535) {
            return Result::fail(400, 'validation', ['message' => 'Description is too long']);
        }

        if ($this->projects->findByAccountIdAndName($user->accountId, $trimName)->hasValue()) {
            return Result::fail(409, 'conflict', ['message' => 'A project with this name already exists']);
        }

        $project = $this->projects->save(new Project(
            id:          null,
            accountId:   $user->accountId,
            name:        $trimName,
            description: $desc,
            createdBy:   $user->id,
        ));

        return Result::ok(201, $project->toPublicArray());
    }

    /** @param array<string, mixed> $patch */
    public function update(?string $userId, string $projectId, array $patch): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $user = $userResult->value();

        $maybe = $this->projects->findByIdAndAccountId($projectId, $user->accountId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Project not found']);
        }
        $existing = $maybe->value();

        $hasName        = array_key_exists('name', $patch);
        $hasDescription = array_key_exists('description', $patch);
        if (!$hasName && !$hasDescription) {
            return Result::fail(400, 'validation', ['message' => 'Nothing to update']);
        }

        $newName = $hasName ? trim((string) $patch['name']) : $existing->name;
        if ($newName === '') {
            return Result::fail(400, 'validation', ['message' => 'Name cannot be empty']);
        }
        if (strlen($newName) > 255) {
            return Result::fail(400, 'validation', ['message' => 'Name must be at most 255 characters']);
        }

        $newDesc = $hasDescription
            ? $this->normalizeDescription($patch['description'])
            : $existing->description;
        if ($newDesc !== null && strlen($newDesc) > 65535) {
            return Result::fail(400, 'validation', ['message' => 'Description is too long']);
        }

        if ($newName !== $existing->name
            && $this->projects->findByAccountIdAndName($user->accountId, $newName, $existing->id)->hasValue()) {
            return Result::fail(409, 'conflict', ['message' => 'A project with this name already exists']);
        }

        $this->projects->update($existing->id, $user->accountId, $newName, $newDesc);

        $updated = $this->projects->findByIdAndAccountId($existing->id, $user->accountId)->value();

        return Result::ok(200, $updated->toPublicArray());
    }

    public function delete(?string $userId, string $projectId): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $user = $userResult->value();

        $maybe = $this->projects->findByIdAndAccountId($projectId, $user->accountId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Project not found']);
        }

        $this->projects->delete($projectId, $user->accountId);

        return Result::ok(200, ['message' => 'Deleted']);
    }

    /** @return Result User on success */
    private function requireUser(?string $userId): Result {
        if (!$userId) {
            return Result::fail(401, 'unauthorized', ['message' => 'Not authenticated']);
        }

        $maybe = $this->users->findById($userId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'User not found']);
        }

        return Result::ok(200, $maybe->value());
    }

    private function normalizeDescription(mixed $description): ?string {
        if ($description === null) {
            return null;
        }
        $s = trim((string) $description);

        return $s === '' ? null : $s;
    }
}

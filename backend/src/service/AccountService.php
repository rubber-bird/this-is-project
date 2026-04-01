<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';

class AccountService
{
    public function __construct(
        private readonly UserRepository $users,
    ) {}

    public function whoami(?string $userId): Result {
        if (!$userId) {
            return Result::fail(401, 'unauthorized', ['message' => 'Not authenticated']);
        }

        return $this->getUserById($userId);
    }

    public function getUserById(string $id): Result {
        $maybe = $this->users->findById($id);

        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'User not found']);
        }

        return Result::ok(200, $maybe->value()->toPublicArray());
    }
}

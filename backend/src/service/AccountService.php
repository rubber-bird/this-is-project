<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/Role.php';

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

    public function listUsers(?string $userId): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $user = $userResult->value();

        $list = $this->users->findAllByAccountId($user->accountId);
        $out = array_map(fn (User $u) => $u->toPublicArray(), $list);

        return Result::ok(200, $out);
    }

    public function addUser(?string $userId, mixed $givenName, mixed $familyName, mixed $email, mixed $password): Result {
        $userResult = $this->requireUser($userId);
        if ($userResult->failed()) {
            return $userResult;
        }
        $current = $userResult->value();

        $givenName = trim((string) $givenName);
        $familyName = trim((string) $familyName);
        $email = trim((string) $email);
        $password = (string) $password;

        if ($givenName === '') {
            return Result::fail(400, 'validation', ['message' => 'Given name is required']);
        }
        if ($familyName === '') {
            return Result::fail(400, 'validation', ['message' => 'Family name is required']);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Result::fail(400, 'validation', ['message' => "Invalid email: $email"]);
        }
        if (strlen($password) < 6) {
            return Result::fail(400, 'validation', ['message' => 'Password must be at least 6 characters']);
        }

        if ($this->users->findByEmail($email)->hasValue()) {
            return Result::fail(409, 'conflict', ['message' => "User already exists: $email"]);
        }

        $created = $this->users->save(new User(
            id:         null,
            accountId:  $current->accountId,
            givenName:  $givenName,
            familyName: $familyName,
            email:      $email,
            password:   password_hash($password, PASSWORD_BCRYPT),
            role:       Role::User,
        ));

        return Result::ok(201, $created->toPublicArray());
    }

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
}

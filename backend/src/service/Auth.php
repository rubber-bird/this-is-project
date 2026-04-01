<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/AccountRepository.php';
require_once __DIR__ . '/../data/Role.php';

class Auth
{
    public function __construct(
        private readonly UserRepository    $users,
        private readonly AccountRepository $accounts,
    ) {}

    public function signUp(string $givenName, string $familyName, string $email, string $password): Result {
        if (empty($givenName)) {
            return Result::fail(400, 'validation', ['message' => 'Given name is required']);
        }
        if (empty($familyName)) {
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

        $account = $this->accounts->save(
            new Account(id: null, name: "$givenName's account")
        );

        $user = $this->users->save(new User(
            id:         null,
            accountId:  $account->id,
            givenName:  $givenName,
            familyName: $familyName,
            email:      $email,
            password:   password_hash($password, PASSWORD_BCRYPT),
            role:       Role::Owner,
        ));

        return Result::ok(200, $user->toPublicArray());
    }

    public function signIn(string $email, string $password): Result {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Result::fail(400, 'validation', ['message' => "Invalid email: $email"]);
        }
        if (empty($password)) {
            return Result::fail(400, 'validation', ['message' => 'Password is required']);
        }

        $maybe = $this->users->findByEmail($email);

        if (!$maybe->hasValue() || !password_verify($password, $maybe->value()->password)) {
            return Result::fail(401, 'unauthorized', ['message' => 'Invalid credentials']);
        }

        return Result::ok(200, $maybe->value()->toPublicArray());
    }
}

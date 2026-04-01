<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/User.php';

class UserRepository
{
    public function findById(string $id): Maybe {
        $stmt = Database::get()->prepare("SELECT id, account_id, given_name, family_name, email, password, role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function findByEmail(string $email): Maybe {
        $stmt = Database::get()->prepare("SELECT id, account_id, given_name, family_name, email, password, role FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function save(User $user): User {
        $id = $user->id ?? Uuid::generate();

        $stmt = Database::get()->prepare(
            "INSERT INTO users (id, account_id, given_name, family_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$id, $user->accountId, $user->givenName, $user->familyName, $user->email, $user->password, $user->role->value]);

        return new User(
            id: $id,
            accountId: $user->accountId,
            givenName: $user->givenName,
            familyName: $user->familyName,
            email: $user->email,
            password: $user->password,
            role: $user->role,
        );
    }

    private function hydrate(array $row): User {
        return new User(
            id: $row['id'],
            accountId: $row['account_id'],
            givenName: $row['given_name'],
            familyName: $row['family_name'],
            email: $row['email'],
            password: $row['password'],
            role: Role::from($row['role']),
        );
    }
}

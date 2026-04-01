<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/Account.php';

class AccountRepository
{
    public function findById(string $id): Maybe {
        $stmt = Database::get()->prepare("SELECT id, name FROM accounts WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function save(Account $account): Account {
        $id = $account->id ?? Uuid::generate();

        $stmt = Database::get()->prepare(
            "INSERT INTO accounts (id, name) VALUES (?, ?)"
        );
        $stmt->execute([$id, $account->name]);

        return new Account(id: $id, name: $account->name);
    }

    private function hydrate(array $row): Account {
        return new Account(
            id: $row['id'],
            name: $row['name'],
        );
    }
}

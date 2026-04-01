<?php

require_once __DIR__ . '/Role.php';

class User
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $accountId,
        public readonly string $givenName,
        public readonly string $familyName,
        public readonly string $email,
        public readonly string $password,
        public readonly Role $role = Role::User,
    ) {}

    public function toPublicArray(): array {
        return [
            'id' => $this->id,
            'account_id' => $this->accountId,
            'given_name' => $this->givenName,
            'family_name' => $this->familyName,
            'email' => $this->email,
            'role' => $this->role->value,
        ];
    }
}

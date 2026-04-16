<?php

class Project
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $accountId,
        public readonly string $name,
        public readonly ?string $description,
        public readonly ?string $createdBy,
        public readonly ?string $createdAt = null,
        public readonly ?string $updatedAt = null,
    ) {}

    /** @return array<string, mixed> */
    public function toPublicArray(): array {
        return [
            'id'          => $this->id,
            'account_id'  => $this->accountId,
            'name'        => $this->name,
            'description' => $this->description,
            'created_by'  => $this->createdBy,
            'created_at'  => $this->createdAt,
            'updated_at'  => $this->updatedAt,
        ];
    }
}

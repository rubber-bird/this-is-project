<?php

class WorkflowStatus
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $projectId,
        public readonly string $name,
        public readonly ?string $color,
        public readonly int $position,
        public readonly ?string $createdAt = null,
        public readonly ?string $updatedAt = null,
    ) {}

    /** @return array<string, mixed> */
    public function toPublicArray(): array {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'name' => $this->name,
            'color' => $this->color,
            'position' => $this->position,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}

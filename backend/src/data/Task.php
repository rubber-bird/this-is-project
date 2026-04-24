<?php

class Task
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $projectId,
        public readonly string $workflowStatusId,
        public readonly string $title,
        public readonly ?string $description,
        public readonly ?string $createdBy,
        public readonly ?string $createdAt = null,
        public readonly ?string $updatedAt = null,
    ) {}

    /** @return array<string, mixed> */
    public function toPublicArray(): array {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'workflow_status_id' => $this->workflowStatusId,
            'title' => $this->title,
            'description' => $this->description,
            'created_by' => $this->createdBy,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
        ];
    }
}

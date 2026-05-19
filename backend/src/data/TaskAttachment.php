<?php

class TaskAttachment
{
    public function __construct(
        public readonly string $id,
        public readonly string $taskId,
        public readonly string $projectId,
        public readonly string $originalFilename,
        public readonly string $storedName,
        public readonly ?string $mimeType,
        public readonly int $sizeBytes,
        public readonly ?string $uploadedBy,
        public readonly ?string $createdAt = null,
    ) {}

    /** @return array<string, mixed> */
    public function toPublicArray(): array {
        return [
            'id' => $this->id,
            'task_id' => $this->taskId,
            'project_id' => $this->projectId,
            'original_filename' => $this->originalFilename,
            'mime_type' => $this->mimeType,
            'size_bytes' => $this->sizeBytes,
            'uploaded_by' => $this->uploadedBy,
            'created_at' => $this->createdAt,
        ];
    }
}

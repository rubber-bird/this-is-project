<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/ProjectRepository.php';
require_once __DIR__ . '/../data/TaskRepository.php';
require_once __DIR__ . '/../data/TaskAttachmentRepository.php';
require_once __DIR__ . '/../data/TaskAttachment.php';
require_once __DIR__ . '/../util/TaskAttachmentStorage.php';
require_once __DIR__ . '/../util/Uuid.php';

class TaskAttachmentService
{
    private const MAX_BYTES = 10 * 1024 * 1024;
    private const FILENAME_MAX = 255;

    public function __construct(
        private readonly UserRepository $users,
        private readonly ProjectRepository $projects,
        private readonly TaskRepository $tasks,
        private readonly TaskAttachmentRepository $attachments,
        private readonly TaskAttachmentStorage $storage,
    ) {}

    public function list(?string $userId, string $projectId, string $taskId): Result {
        $access = $this->requireTask($userId, $projectId, $taskId);
        if ($access->failed()) {
            return $access;
        }

        $list = $this->attachments->findByTaskId($taskId, $projectId);
        $out = array_map(fn (TaskAttachment $a) => $a->toPublicArray(), $list);

        return Result::ok(200, $out);
    }

    /** @param array<string, mixed>|null $upload */
    public function upload(?string $userId, string $projectId, string $taskId, ?array $upload): Result {
        $access = $this->requireTask($userId, $projectId, $taskId);
        if ($access->failed()) {
            return $access;
        }
        $user = $access->value()['user'];

        if ($upload === null || !isset($upload['error'])) {
            return Result::fail(400, 'validation', ['message' => 'No file uploaded']);
        }

        $error = (int) $upload['error'];
        if ($error === UPLOAD_ERR_NO_FILE) {
            return Result::fail(400, 'validation', ['message' => 'No file uploaded']);
        }
        if ($error !== UPLOAD_ERR_OK) {
            return Result::fail(400, 'validation', ['message' => 'File upload failed']);
        }

        $size = (int) ($upload['size'] ?? 0);
        if ($size <= 0) {
            return Result::fail(400, 'validation', ['message' => 'File is empty']);
        }
        if ($size > self::MAX_BYTES) {
            return Result::fail(400, 'validation', ['message' => 'File must be at most 10 MB']);
        }

        $originalName = $this->sanitizeFilename((string) ($upload['name'] ?? 'file'));
        if ($originalName === '') {
            return Result::fail(400, 'validation', ['message' => 'Invalid file name']);
        }

        $tmpName = (string) ($upload['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            return Result::fail(400, 'validation', ['message' => 'Invalid upload']);
        }

        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $storedName = Uuid::generate() . ($ext !== '' ? '.' . strtolower($ext) : '');
        $mimeType = $this->detectMimeType($tmpName, $upload);

        try {
            $this->storage->storeUploadedFile($projectId, $taskId, $storedName, $upload);
        } catch (Throwable) {
            return Result::fail(500, 'server_error', ['message' => 'Could not save file']);
        }

        try {
            $saved = $this->attachments->save(new TaskAttachment(
                id: '',
                taskId: $taskId,
                projectId: $projectId,
                originalFilename: $originalName,
                storedName: $storedName,
                mimeType: $mimeType,
                sizeBytes: $size,
                uploadedBy: $user->id,
            ));
        } catch (Throwable) {
            $this->storage->deleteFile($projectId, $taskId, $storedName);

            return Result::fail(500, 'server_error', ['message' => 'Could not save attachment']);
        }

        return Result::ok(201, $saved->toPublicArray());
    }

    public function download(?string $userId, string $projectId, string $taskId, string $attachmentId): Result {
        $access = $this->requireTask($userId, $projectId, $taskId);
        if ($access->failed()) {
            return $access;
        }

        $maybe = $this->attachments->findById($attachmentId, $taskId, $projectId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Attachment not found']);
        }

        $attachment = $maybe->value();
        $path = $this->storage->filePath($projectId, $taskId, $attachment->storedName);
        if (!is_file($path)) {
            return Result::fail(404, 'not_found', ['message' => 'File not found']);
        }

        return Result::ok(200, [
            '__file' => [
                'path' => $path,
                'filename' => $attachment->originalFilename,
                'mime_type' => $attachment->mimeType ?? 'application/octet-stream',
            ],
        ]);
    }

    public function delete(?string $userId, string $projectId, string $taskId, string $attachmentId): Result {
        $access = $this->requireTask($userId, $projectId, $taskId);
        if ($access->failed()) {
            return $access;
        }

        $maybe = $this->attachments->findById($attachmentId, $taskId, $projectId);
        if (!$maybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Attachment not found']);
        }

        $attachment = $maybe->value();
        $this->attachments->delete($attachmentId, $taskId, $projectId);
        $this->storage->deleteFile($projectId, $taskId, $attachment->storedName);

        return Result::ok(200, ['message' => 'Deleted']);
    }

    public function deleteAllForTask(string $projectId, string $taskId): void {
        $this->attachments->deleteByTaskId($taskId, $projectId);
        $this->storage->deleteTaskDir($projectId, $taskId);
    }

    /** @return Result value: ['user' => User, 'task' => Task] */
    private function requireTask(?string $userId, string $projectId, string $taskId): Result {
        if (!$userId) {
            return Result::fail(401, 'unauthorized', ['message' => 'Not authenticated']);
        }

        $userMaybe = $this->users->findById($userId);
        if (!$userMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'User not found']);
        }
        $user = $userMaybe->value();

        $projectMaybe = $this->projects->findByIdAndAccountId($projectId, $user->accountId);
        if (!$projectMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Project not found']);
        }

        $taskMaybe = $this->tasks->findByIdAndProjectId($taskId, $projectId);
        if (!$taskMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Task not found']);
        }

        return Result::ok(200, ['user' => $user, 'task' => $taskMaybe->value()]);
    }

    private function sanitizeFilename(string $name): string {
        $base = basename(str_replace('\\', '/', $name));
        $base = trim($base);
        if ($base === '' || $base === '.' || $base === '..') {
            return '';
        }
        if (strlen($base) > self::FILENAME_MAX) {
            $base = substr($base, 0, self::FILENAME_MAX);
        }

        return $base;
    }

    /** @param array<string, mixed> $upload */
    private function detectMimeType(string $tmpName, array $upload): ?string {
        $fromClient = trim((string) ($upload['type'] ?? ''));
        if ($fromClient !== '' && $fromClient !== 'application/octet-stream') {
            return $fromClient;
        }
        if (function_exists('mime_content_type')) {
            $detected = mime_content_type($tmpName);

            return is_string($detected) && $detected !== '' ? $detected : null;
        }

        return null;
    }
}

<?php

class TaskAttachmentStorage
{
    public function __construct(private readonly string $baseDir) {}

    public static function fromBackendRoot(string $backendRoot): self {
        return new self($backendRoot . '/uploads');
    }

    public function taskDir(string $projectId, string $taskId): string {
        return $this->baseDir . '/' . $projectId . '/' . $taskId;
    }

    public function filePath(string $projectId, string $taskId, string $storedName): string {
        return $this->taskDir($projectId, $taskId) . '/' . $storedName;
    }

    public function ensureTaskDir(string $projectId, string $taskId): void {
        $dir = $this->taskDir($projectId, $taskId);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create upload directory');
        }
    }

    /** @param array{tmp_name: string, name: string} $upload */
    public function storeUploadedFile(string $projectId, string $taskId, string $storedName, array $upload): void {
        $this->ensureTaskDir($projectId, $taskId);
        $dest = $this->filePath($projectId, $taskId, $storedName);
        if (!move_uploaded_file($upload['tmp_name'], $dest)) {
            throw new RuntimeException('Failed to store uploaded file');
        }
    }

    public function deleteFile(string $projectId, string $taskId, string $storedName): void {
        $path = $this->filePath($projectId, $taskId, $storedName);
        if (is_file($path)) {
            unlink($path);
        }
    }

    public function deleteTaskDir(string $projectId, string $taskId): void {
        $dir = $this->taskDir($projectId, $taskId);
        if (!is_dir($dir)) {
            return;
        }
        foreach (glob($dir . '/*') ?: [] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        rmdir($dir);
    }
}

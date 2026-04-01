<?php

class Logger
{
    private string $path;

    public function __construct(string $path) {
        $this->path = $path;
    }

    public function error(string $message, array $context = []): void {
        $this->write('ERROR', $message, $context);
    }

    public function info(string $message, array $context = []): void {
        $this->write('INFO', $message, $context);
    }

    private function write(string $level, string $message, array $context): void {
        $timestamp = date('Y-m-d H:i:s');
        $line = "[$timestamp] [$level] $message";

        if (!empty($context)) {
            $line .= ' ' . json_encode($context);
        }

        file_put_contents($this->path, $line . PHP_EOL, FILE_APPEND);
    }
}

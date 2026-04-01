<?php

class Result
{
    private function __construct(
        private readonly bool  $success,
        private readonly int   $code,
        private readonly mixed $data,
    ) {}

    /** Success: code + data */
    public static function ok(int $code, mixed $data): self {
        return new self(true, $code, $data);
    }

    /** Failure: code + type + body */
    public static function fail(int $code, string $type, array $body): self {
        return new self(false, $code, ['type' => $type, 'body' => $body]);
    }

    public function succeeded(): bool {
        return $this->success;
    }

    public function failed(): bool {
        return !$this->success;
    }

    public function code(): int {
        return $this->code;
    }

    public function value(): mixed {
        if ($this->failed()) {
            throw new RuntimeException("Cannot access value on a failed Result");
        }
        return $this->data;
    }

    public function type(): string {
        if ($this->succeeded()) {
            throw new RuntimeException("Cannot access type on a succeeded Result");
        }
        return $this->data['type'];
    }

    public function body(): array {
        if ($this->succeeded()) {
            throw new RuntimeException("Cannot access body on a succeeded Result");
        }
        return $this->data['body'];
    }
}

<?php

class Maybe
{
    private function __construct(
        private readonly bool  $has,
        private readonly mixed $val,
    ) {}

    public static function some(mixed $value): self {
        return new self(true, $value);
    }

    public static function none(): self {
        return new self(false, null);
    }

    public function hasValue(): bool {
        return $this->has;
    }

    public function value(): mixed {
        if (!$this->has) {
            throw new RuntimeException("Cannot access value on None");
        }
        return $this->val;
    }

    public function valueOr(mixed $default): mixed {
        return $this->has ? $this->val : $default;
    }
}

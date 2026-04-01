<?php

require_once __DIR__ . '/Result.php';

class ResultMapper
{
    /** @return array{code: int, body: mixed} */
    public static function toResponse(Result $result): array {
        if ($result->succeeded()) {
            return ['code' => $result->code(), 'body' => $result->value()];
        }

        return [
            'code' => $result->code(),
            'body' => [
                'type'  => $result->type(),
                'error' => $result->body(),
            ],
        ];
    }
}

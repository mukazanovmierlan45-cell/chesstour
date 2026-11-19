<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Нарушение бизнес-правила. Выводится в bootstrap/app.php как 409 Conflict.
 */
class BusinessException extends RuntimeException
{
    public function __construct(string $message, private readonly int $status = 409)
    {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }
}

<?php

namespace App\Exceptions;

/**
 * Внешний ИИ-сервис недоступен или ответил ошибкой — клиенту отдаётся 503.
 */
class AiServiceException extends BusinessException
{
    public function __construct(string $message = 'ИИ-ассистент временно недоступен, попробуйте позже')
    {
        parent::__construct($message, 503);
    }
}

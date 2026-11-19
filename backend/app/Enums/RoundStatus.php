<?php

namespace App\Enums;

enum RoundStatus: string
{
    case Pending = 'pending';
    case Ongoing = 'ongoing';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Не начат',
            self::Ongoing => 'Идёт',
            self::Completed => 'Завершён',
        };
    }
}

<?php

namespace App\Enums;

enum TimeControlType: string
{
    case Classical = 'classical';
    case Rapid = 'rapid';
    case Blitz = 'blitz';
    case Bullet = 'bullet';

    public function label(): string
    {
        return match ($this) {
            self::Classical => 'Классика',
            self::Rapid => 'Рапид',
            self::Blitz => 'Блиц',
            self::Bullet => 'Пуля',
        };
    }
}

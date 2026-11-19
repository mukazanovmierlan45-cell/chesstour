<?php

namespace App\Enums;

enum UserRole: string
{
    case Player = 'player';
    case Organizer = 'organizer';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Player => 'Игрок',
            self::Organizer => 'Организатор',
            self::Admin => 'Администратор',
        };
    }
}

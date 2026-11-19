<?php

namespace App\Enums;

enum TournamentFormat: string
{
    case Swiss = 'swiss';
    case RoundRobin = 'round_robin';

    public function label(): string
    {
        return match ($this) {
            self::Swiss => 'Швейцарская система',
            self::RoundRobin => 'Круговая система',
        };
    }
}

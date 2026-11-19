<?php

namespace App\Enums;

enum ParticipantStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Заявка',
            self::Confirmed => 'Допущен',
            self::Withdrawn => 'Снялся',
        };
    }
}

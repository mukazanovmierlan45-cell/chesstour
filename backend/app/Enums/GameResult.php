<?php

namespace App\Enums;

enum GameResult: string
{
    case Pending = 'pending';
    case WhiteWin = 'white_win';
    case BlackWin = 'black_win';
    case Draw = 'draw';
    case Bye = 'bye';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Не сыграна',
            self::WhiteWin => 'Победа белых',
            self::BlackWin => 'Победа чёрных',
            self::Draw => 'Ничья',
            self::Bye => 'Без пары',
        };
    }

    /** Запись результата в шахматной нотации. */
    public function notation(): string
    {
        return match ($this) {
            self::Pending => '*',
            self::WhiteWin => '1-0',
            self::BlackWin => '0-1',
            self::Draw => '½-½',
            self::Bye => '+',
        };
    }

    public function whitePoints(): float
    {
        return match ($this) {
            self::WhiteWin, self::Bye => 1.0,
            self::Draw => 0.5,
            self::BlackWin, self::Pending => 0.0,
        };
    }

    public function blackPoints(): float
    {
        return match ($this) {
            self::BlackWin => 1.0,
            self::Draw => 0.5,
            default => 0.0,
        };
    }

    public function isFinished(): bool
    {
        return $this !== self::Pending;
    }
}

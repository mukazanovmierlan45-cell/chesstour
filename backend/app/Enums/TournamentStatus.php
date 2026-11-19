<?php

namespace App\Enums;

enum TournamentStatus: string
{
    case Draft = 'draft';
    case Registration = 'registration';
    case Ongoing = 'ongoing';
    case Finished = 'finished';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Черновик',
            self::Registration => 'Регистрация',
            self::Ongoing => 'Идёт',
            self::Finished => 'Завершён',
            self::Cancelled => 'Отменён',
        };
    }

    /**
     * Допустимые переходы статуса (бизнес-правило).
     *
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [self::Registration, self::Cancelled],
            self::Registration => [self::Ongoing, self::Cancelled],
            self::Ongoing => [self::Finished, self::Cancelled],
            self::Finished, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }
}

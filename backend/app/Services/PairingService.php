<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Game;
use App\Models\Tournament;
use Illuminate\Support\Collection;

/**
 * Автоматическая жеребьёвка тура.
 * Возвращает пары [white_id, black_id|null]; null — игрок без пары (bye).
 */
class PairingService
{
    public function __construct(private readonly StandingsService $standings)
    {
    }

    /**
     * @param  Collection<int, \App\Models\User>  $players  подтверждённые участники
     * @return array<int, array{0: int, 1: int|null}>
     */
    public function pair(Tournament $tournament, Collection $players, int $roundNumber): array
    {
        return $tournament->format->value === 'round_robin'
            ? $this->roundRobin($players, $roundNumber)
            : $this->swiss($tournament, $players);
    }

    /**
     * Круговая система: метод «по кругу» (таблица Бергера).
     *
     * @return array<int, array{0: int, 1: int|null}>
     */
    public function roundRobin(Collection $players, int $roundNumber): array
    {
        $ids = $players
            ->sortBy([
                fn ($a, $b) => ($a->pivot->start_number ?? PHP_INT_MAX) <=> ($b->pivot->start_number ?? PHP_INT_MAX),
                fn ($a, $b) => $b->pivot->rating_at_start <=> $a->pivot->rating_at_start,
            ])
            ->pluck('id')
            ->all();

        if (count($ids) % 2 === 1) {
            $ids[] = null; // фиктивный соперник = bye
        }

        $n = count($ids);
        if ($roundNumber > $n - 1) {
            throw new BusinessException('В круговом турнире с таким числом участников не может быть больше '.($n - 1).' туров');
        }

        $fixed = array_shift($ids);
        $rest = $ids;
        for ($i = 1; $i < $roundNumber; $i++) {
            array_unshift($rest, array_pop($rest));
        }
        $order = array_merge([$fixed], $rest);

        $pairs = [];
        for ($i = 0; $i < $n / 2; $i++) {
            $a = $order[$i];
            $b = $order[$n - 1 - $i];
            // Чередуем цвет, чтобы игроки получали белые примерно поровну
            $swap = ($i === 0) ? ($roundNumber % 2 === 0) : ($i % 2 === 1);
            [$white, $black] = $swap ? [$b, $a] : [$a, $b];
            $pairs[] = $this->normalize($white, $black);
        }

        return $this->byesLast($pairs);
    }

    /**
     * Упрощённая швейцарская система: игроки сортируются по очкам и рейтингу,
     * соседи играют между собой, повторные встречи по возможности исключаются.
     *
     * @return array<int, array{0: int, 1: int|null}>
     */
    public function swiss(Tournament $tournament, Collection $players): array
    {
        $points = $this->standings->pointsMap($tournament);
        $games = $tournament->games()->get();

        $met = [];
        $hadBye = [];
        $colorBalance = [];
        foreach ($games as $game) {
            /** @var Game $game */
            $w = $game->white_player_id;
            $b = $game->black_player_id;
            $colorBalance[$w] = ($colorBalance[$w] ?? 0) + 1;
            if ($b === null) {
                $hadBye[$w] = true;

                continue;
            }
            $colorBalance[$b] = ($colorBalance[$b] ?? 0) - 1;
            $met[$w][$b] = true;
            $met[$b][$w] = true;
        }

        $queue = $players
            ->sort(fn ($a, $b) => [$points[$b->id] ?? 0, $b->pivot->rating_at_start]
                <=> [$points[$a->id] ?? 0, $a->pivot->rating_at_start])
            ->pluck('id')
            ->values()
            ->all();

        $pairs = [];

        // Нечётное число: bye получает самый слабый, у кого его ещё не было
        if (count($queue) % 2 === 1) {
            $byeIndex = count($queue) - 1;
            for ($i = count($queue) - 1; $i >= 0; $i--) {
                if (empty($hadBye[$queue[$i]])) {
                    $byeIndex = $i;
                    break;
                }
            }
            $byePlayer = array_splice($queue, $byeIndex, 1)[0];
            $pairs[] = [$byePlayer, null];
        }

        while (count($queue) > 0) {
            $first = array_shift($queue);
            $opponentIndex = 0;
            foreach ($queue as $i => $candidate) {
                if (empty($met[$first][$candidate])) {
                    $opponentIndex = $i;
                    break;
                }
            }
            $second = array_splice($queue, $opponentIndex, 1)[0];

            // Белые получает тот, кто реже играл белыми
            $firstBalance = $colorBalance[$first] ?? 0;
            $secondBalance = $colorBalance[$second] ?? 0;
            $pairs[] = $firstBalance <= $secondBalance ? [$first, $second] : [$second, $first];
        }

        return $this->byesLast($pairs);
    }

    /** @return array{0: int, 1: int|null} */
    private function normalize(?int $white, ?int $black): array
    {
        return $white === null ? [$black, null] : [$white, $black];
    }

    /**
     * @param  array<int, array{0: int, 1: int|null}>  $pairs
     * @return array<int, array{0: int, 1: int|null}>
     */
    private function byesLast(array $pairs): array
    {
        usort($pairs, fn ($a, $b) => ($a[1] === null) <=> ($b[1] === null));

        return $pairs;
    }
}

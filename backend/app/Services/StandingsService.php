<?php

namespace App\Services;

use App\Enums\GameResult;
use App\Enums\ParticipantStatus;
use App\Models\Game;
use App\Models\Tournament;
use Illuminate\Support\Collection;

/**
 * Турнирная таблица. Очки не хранятся в БД, а считаются по результатам партий.
 */
class StandingsService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function forTournament(Tournament $tournament): array
    {
        $participants = $tournament->participants()
            ->wherePivotIn('status', [ParticipantStatus::Confirmed->value, ParticipantStatus::Withdrawn->value])
            ->get();

        $games = $this->finishedGames($tournament);

        $points = [];
        $wins = [];
        $played = [];
        $opponents = [];

        foreach ($participants as $player) {
            $points[$player->id] = 0.0;
            $wins[$player->id] = 0;
            $played[$player->id] = 0;
            $opponents[$player->id] = [];
        }

        foreach ($games as $game) {
            foreach ([$game->white_player_id, $game->black_player_id] as $playerId) {
                if ($playerId === null || ! array_key_exists($playerId, $points)) {
                    continue;
                }

                $gained = $game->pointsFor($playerId);
                $points[$playerId] += $gained;
                $played[$playerId]++;

                if ($gained === 1.0 && $game->result !== GameResult::Bye) {
                    $wins[$playerId]++;
                }

                $opponent = $game->opponentOf($playerId);
                if ($opponent !== null) {
                    $opponents[$playerId][] = $opponent;
                }
            }
        }

        $rows = $participants->map(function ($player) use ($points, $wins, $played, $opponents) {
            // Коэффициент Бухгольца: сумма очков соперников
            $buchholz = array_sum(array_map(fn ($id) => $points[$id] ?? 0.0, $opponents[$player->id]));

            return [
                'user' => [
                    'id' => $player->id,
                    'name' => $player->name,
                    'rating' => $player->rating,
                ],
                'start_number' => $player->pivot->start_number,
                'rating_at_start' => $player->pivot->rating_at_start,
                'status' => $player->pivot->status,
                'points' => $points[$player->id],
                'buchholz' => $buchholz,
                'wins' => $wins[$player->id],
                'games_played' => $played[$player->id],
            ];
        })->sort(function (array $a, array $b) {
            return [$b['points'], $b['buchholz'], $b['wins'], $b['rating_at_start']]
                <=> [$a['points'], $a['buchholz'], $a['wins'], $a['rating_at_start']];
        })->values();

        return $rows->map(fn (array $row, int $index) => ['place' => $index + 1] + $row)->all();
    }

    /**
     * Очки игроков по id — используется при жеребьёвке швейцарской системы.
     *
     * @return array<int, float>
     */
    public function pointsMap(Tournament $tournament): array
    {
        $map = [];
        foreach ($this->forTournament($tournament) as $row) {
            $map[$row['user']['id']] = $row['points'];
        }

        return $map;
    }

    /** @return Collection<int, Game> */
    public function finishedGames(Tournament $tournament): Collection
    {
        return $tournament->games()
            ->where('result', '!=', GameResult::Pending->value)
            ->get();
    }
}

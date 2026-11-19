<?php

namespace App\Services;

use App\Enums\GameResult;
use App\Enums\TournamentStatus;
use App\Enums\UserRole;
use App\Models\Game;
use App\Models\TimeControl;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Агрегированные данные для администратора (withCount, groupBy, selectRaw, sum).
 */
class StatsService
{
    /** @return array<string, mixed> */
    public function overview(): array
    {
        $byStatus = Tournament::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byResult = Game::query()
            ->selectRaw('result, COUNT(*) as total')
            ->groupBy('result')
            ->pluck('total', 'result');

        $registrations = DB::table('tournament_user')
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $timeControls = TimeControl::query()
            ->withCount('tournaments')
            ->orderByDesc('tournaments_count')
            ->get()
            ->map(fn (TimeControl $tc) => [
                'id' => $tc->id,
                'name' => $tc->name,
                'tournaments_count' => $tc->tournaments_count,
            ]);

        $organizers = User::query()
            ->where('role', UserRole::Organizer->value)
            ->withCount('organizedTournaments')
            ->withSum('organizedTournaments as places_total', 'max_participants')
            ->orderByDesc('organized_tournaments_count')
            ->limit(5)
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'tournaments_count' => $u->organized_tournaments_count,
                'places_total' => (int) $u->places_total,
            ]);

        $activePlayers = DB::table('games')
            ->join('users', function ($join) {
                $join->on('users.id', '=', 'games.white_player_id')
                    ->orOn('users.id', '=', 'games.black_player_id');
            })
            ->where('games.result', '!=', GameResult::Pending->value)
            ->whereNotNull('games.black_player_id')
            ->selectRaw('users.id, users.name, users.rating, COUNT(games.id) as games_played')
            ->groupBy('users.id', 'users.name', 'users.rating')
            ->orderByDesc('games_played')
            ->limit(5)
            ->get();

        return [
            'tournaments' => [
                'total' => (int) $byStatus->sum(),
                'by_status' => collect(TournamentStatus::cases())
                    ->mapWithKeys(fn ($s) => [$s->value => (int) ($byStatus[$s->value] ?? 0)]),
            ],
            'games' => [
                'total' => (int) $byResult->sum(),
                'by_result' => collect(GameResult::cases())
                    ->mapWithKeys(fn ($r) => [$r->value => (int) ($byResult[$r->value] ?? 0)]),
            ],
            'registrations_by_status' => $registrations,
            'popular_time_controls' => $timeControls,
            'top_organizers' => $organizers,
            'most_active_players' => $activePlayers,
        ];
    }
}

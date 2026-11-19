<?php

namespace App\Services;

use App\Enums\GameResult;
use App\Enums\RoundStatus;
use App\Exceptions\BusinessException;
use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class GameService
{
    /**
     * @param  array{result: string, pgn?: string|null}  $data
     */
    public function recordResult(Game $game, array $data): Game
    {
        if ($game->round->status !== RoundStatus::Ongoing) {
            throw new BusinessException('Тур не идёт — результат партии изменить нельзя');
        }

        if ($game->isBye()) {
            throw new BusinessException('У игрока без пары результат фиксированный (+1 очко)');
        }

        $game->result = GameResult::from($data['result']);
        if (array_key_exists('pgn', $data)) {
            $game->pgn = $data['pgn'];
        }
        $game->save();

        Log::info('Внесён результат партии', ['game_id' => $game->id, 'result' => $game->result->value]);

        return $game->load(['whitePlayer', 'blackPlayer']);
    }

    public function myGames(User $user): Collection
    {
        return Game::query()
            ->where(fn ($q) => $q->where('white_player_id', $user->id)->orWhere('black_player_id', $user->id))
            ->with(['whitePlayer', 'blackPlayer', 'round.tournament'])
            ->latest('id')
            ->limit(100)
            ->get();
    }
}

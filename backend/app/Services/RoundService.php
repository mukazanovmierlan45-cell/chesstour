<?php

namespace App\Services;

use App\Enums\GameResult;
use App\Enums\RoundStatus;
use App\Enums\TournamentStatus;
use App\Exceptions\BusinessException;
use App\Models\Round;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Ключевой сценарий, часть 2: туры и жеребьёвка.
 */
class RoundService
{
    public function __construct(private readonly PairingService $pairing)
    {
    }

    public function list(Tournament $tournament): Collection
    {
        return $tournament->rounds()
            ->with(['games.whitePlayer', 'games.blackPlayer'])
            ->withCount('games')
            ->get();
    }

    public function load(Round $round): Round
    {
        return $round->load(['games.whitePlayer', 'games.blackPlayer']);
    }

    /**
     * Создание тура и партий выполняется в одной транзакции:
     * при ошибке на любом шаге не остаётся ни тура, ни части пар.
     *
     * @param  array{starts_at?: string|null, auto_pairing?: bool, pairings?: array<int, array{white_player_id: int, black_player_id?: int|null}>}  $data
     */
    public function create(Tournament $tournament, array $data): Round
    {
        return DB::transaction(function () use ($tournament, $data) {
            /** @var Tournament $locked */
            $locked = Tournament::whereKey($tournament->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== TournamentStatus::Ongoing) {
                throw new BusinessException('Туры можно создавать только в турнире со статусом «Идёт»');
            }

            $last = $locked->rounds()->reorder('number', 'desc')->first();
            if ($last && $last->status !== RoundStatus::Completed) {
                throw new BusinessException("Сначала завершите тур №{$last->number}");
            }

            $number = ($last?->number ?? 0) + 1;
            if ($number > $locked->rounds_count) {
                throw new BusinessException("Все {$locked->rounds_count} туров уже сыграны");
            }

            $players = $locked->confirmedParticipants()->get();
            if ($players->count() < 2) {
                throw new BusinessException('Для жеребьёвки нужно минимум 2 допущенных участника');
            }

            $pairs = ($data['auto_pairing'] ?? true)
                ? $this->pairing->pair($locked, $players, $number)
                : $this->manualPairs($data['pairings'] ?? [], $players->pluck('id')->all());

            $round = $locked->rounds()->create([
                'number' => $number,
                'starts_at' => $data['starts_at'] ?? null,
                'status' => RoundStatus::Ongoing,
            ]);

            foreach (array_values($pairs) as $index => [$white, $black]) {
                $round->games()->create([
                    'white_player_id' => $white,
                    'black_player_id' => $black,
                    'board_number' => $index + 1,
                    'result' => $black === null ? GameResult::Bye : GameResult::Pending,
                ]);
            }

            Log::info('Создан тур', [
                'tournament_id' => $locked->id,
                'round' => $number,
                'games' => count($pairs),
            ]);

            return $this->load($round);
        });
    }

    public function complete(Round $round): Round
    {
        return DB::transaction(function () use ($round) {
            /** @var Round $locked */
            $locked = Round::whereKey($round->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === RoundStatus::Completed) {
                throw new BusinessException('Тур уже завершён');
            }

            $pending = $locked->games()->where('result', GameResult::Pending->value)->count();
            if ($pending > 0) {
                throw new BusinessException("Нельзя завершить тур: не внесено результатов — {$pending}");
            }

            $locked->status = RoundStatus::Completed;
            $locked->save();

            Log::info('Тур завершён', ['round_id' => $locked->id]);

            return $this->load($locked);
        });
    }

    public function delete(Round $round): void
    {
        $tournament = $round->tournament;
        $last = $tournament->rounds()->reorder('number', 'desc')->first();

        if (! $last || $last->id !== $round->id) {
            throw new BusinessException('Удалить можно только последний тур');
        }

        $hasResults = $round->games()
            ->whereNotIn('result', [GameResult::Pending->value, GameResult::Bye->value])
            ->exists();
        if ($hasResults) {
            throw new BusinessException('В туре уже есть результаты, удалить его нельзя');
        }

        $round->delete();
        Log::warning('Удалён тур', ['round_id' => $round->id, 'tournament_id' => $tournament->id]);
    }

    /**
     * Ручная жеребьёвка: каждый игрок — допущенный участник и встречается в туре один раз.
     *
     * @param  array<int, array{white_player_id: int, black_player_id?: int|null}>  $pairings
     * @param  array<int, int>  $allowed
     * @return array<int, array{0: int, 1: int|null}>
     */
    private function manualPairs(array $pairings, array $allowed): array
    {
        $used = [];
        $pairs = [];

        foreach ($pairings as $pair) {
            $white = (int) $pair['white_player_id'];
            $black = isset($pair['black_player_id']) ? (int) $pair['black_player_id'] : null;

            foreach (array_filter([$white, $black]) as $id) {
                if (! in_array($id, $allowed, true)) {
                    throw new BusinessException("Игрок #{$id} не является допущенным участником турнира");
                }
                if (isset($used[$id])) {
                    throw new BusinessException("Игрок #{$id} указан в туре дважды");
                }
                $used[$id] = true;
            }

            $pairs[] = [$white, $black];
        }

        usort($pairs, fn ($a, $b) => ($a[1] === null) <=> ($b[1] === null));

        return $pairs;
    }
}

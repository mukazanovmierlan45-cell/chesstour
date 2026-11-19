<?php

namespace App\Services;

use App\Enums\ParticipantStatus;
use App\Enums\RoundStatus;
use App\Enums\TournamentStatus;
use App\Exceptions\BusinessException;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TournamentService
{
    /** Белый список полей сортировки (защита от подстановки произвольного столбца). */
    public const SORTABLE = ['start_date', 'title', 'created_at', 'max_participants'];

    /**
     * Список с фильтрацией, поиском, сортировкой и пагинацией.
     *
     * @param  array<string, mixed>  $params
     */
    public function list(array $params): LengthAwarePaginator
    {
        $sort = in_array($params['sort'] ?? null, self::SORTABLE, true) ? $params['sort'] : 'start_date';
        $order = ($params['order'] ?? 'asc') === 'desc' ? 'desc' : 'asc';

        return Tournament::query()
            ->with(['organizer', 'timeControl'])
            ->withCount($this->activeParticipantsCount())
            ->filter($params)
            ->search($params['search'] ?? null)
            ->orderBy($sort, $order)
            ->orderBy('id')
            ->paginate((int) ($params['per_page'] ?? 10))
            ->withQueryString();
    }

    public function load(Tournament $tournament): Tournament
    {
        return $tournament
            ->load(['organizer', 'timeControl'])
            ->loadCount($this->activeParticipantsCount())
            ->loadCount('rounds as rounds_created_count');
    }

    public function create(User $organizer, array $data): Tournament
    {
        $tournament = $organizer->organizedTournaments()->create($data);

        Log::info('Создан турнир', ['tournament_id' => $tournament->id, 'user_id' => $organizer->id]);

        return $this->load($tournament);
    }

    public function update(Tournament $tournament, array $data): Tournament
    {
        if (in_array($tournament->status, [TournamentStatus::Finished, TournamentStatus::Cancelled], true)) {
            throw new BusinessException('Завершённый или отменённый турнир изменять нельзя');
        }

        if (isset($data['max_participants'])) {
            $active = $this->activeCount($tournament);
            if ($data['max_participants'] < $active) {
                throw new BusinessException("Нельзя уменьшить число мест: уже подано заявок — {$active}");
            }
        }

        if (isset($data['rounds_count']) && $data['rounds_count'] < $tournament->rounds()->count()) {
            throw new BusinessException('Число туров не может быть меньше уже созданных');
        }

        $tournament->update($data);

        return $this->load($tournament);
    }

    public function delete(Tournament $tournament): void
    {
        if ($tournament->games()->exists()) {
            throw new BusinessException('Нельзя удалить турнир, в котором уже есть партии. Отмените его');
        }

        $poster = $tournament->poster_path;
        $tournament->delete();

        if ($poster) {
            Storage::disk('public')->delete($poster);
        }

        Log::warning('Удалён турнир', ['tournament_id' => $tournament->id]);
    }

    /**
     * Смена статуса по правилам из TournamentStatus::allowedTransitions().
     */
    public function changeStatus(Tournament $tournament, TournamentStatus $next): Tournament
    {
        return DB::transaction(function () use ($tournament, $next) {
            /** @var Tournament $locked */
            $locked = Tournament::whereKey($tournament->id)->lockForUpdate()->firstOrFail();
            $current = $locked->status;

            if (! $current->canTransitionTo($next)) {
                throw new BusinessException(
                    "Нельзя перевести турнир из статуса «{$current->label()}» в «{$next->label()}»"
                );
            }

            if ($next === TournamentStatus::Ongoing) {
                $this->prepareStart($locked);
            }

            if ($next === TournamentStatus::Finished) {
                $unfinished = $locked->rounds()->where('status', '!=', RoundStatus::Completed->value)->exists();
                if ($unfinished || ! $locked->rounds()->exists()) {
                    throw new BusinessException('Турнир можно завершить только после окончания всех созданных туров');
                }
            }

            $locked->status = $next;
            $locked->save();

            Log::info('Изменён статус турнира', [
                'tournament_id' => $locked->id,
                'from' => $current->value,
                'to' => $next->value,
            ]);

            return $this->load($locked);
        });
    }

    public function uploadPoster(Tournament $tournament, UploadedFile $file): Tournament
    {
        $old = $tournament->poster_path;
        $tournament->poster_path = $file->store('posters', 'public');
        $tournament->save();

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return $this->load($tournament);
    }

    /**
     * Перед стартом нужно минимум 2 допущенных игрока; им без номера
     * присваиваются стартовые номера по убыванию рейтинга.
     */
    private function prepareStart(Tournament $tournament): void
    {
        $confirmed = $tournament->confirmedParticipants()->get();

        if ($confirmed->count() < 2) {
            throw new BusinessException('Для старта нужно минимум 2 допущенных участника');
        }

        $next = (int) $confirmed->max(fn ($u) => $u->pivot->start_number ?? 0);
        $withoutNumber = $confirmed
            ->filter(fn ($u) => $u->pivot->start_number === null)
            ->sortByDesc(fn ($u) => $u->pivot->rating_at_start);

        foreach ($withoutNumber as $user) {
            $tournament->participants()->updateExistingPivot($user->id, ['start_number' => ++$next]);
        }
    }

    private function activeCount(Tournament $tournament): int
    {
        return $tournament->participants()
            ->wherePivot('status', '!=', ParticipantStatus::Withdrawn->value)
            ->count();
    }

    /** @return array<string, \Closure> */
    private function activeParticipantsCount(): array
    {
        return [
            'participants as participants_count' => fn ($q) => $q
                ->where('tournament_user.status', '!=', ParticipantStatus::Withdrawn->value),
        ];
    }
}

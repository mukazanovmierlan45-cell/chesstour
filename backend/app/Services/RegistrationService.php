<?php

namespace App\Services;

use App\Enums\ParticipantStatus;
use App\Enums\TournamentStatus;
use App\Exceptions\BusinessException;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Ключевой сценарий, часть 1: заявки игроков на турнир (связь M:N).
 */
class RegistrationService
{
    public function participants(Tournament $tournament, ?string $status = null): Collection
    {
        return $tournament->participants()
            ->when($status, fn ($q) => $q->wherePivot('status', $status))
            ->orderByPivot('start_number')
            ->orderByDesc('tournament_user.rating_at_start')
            ->get();
    }

    public function register(Tournament $tournament, User $user): User
    {
        return DB::transaction(function () use ($tournament, $user) {
            // Блокировка строки турнира: две одновременные заявки не займут одно последнее место
            /** @var Tournament $locked */
            $locked = Tournament::whereKey($tournament->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isRegistrationOpen()) {
                throw new BusinessException('Регистрация на турнир закрыта');
            }

            if ($locked->min_rating !== null && $user->rating < $locked->min_rating) {
                throw new BusinessException("Для участия нужен рейтинг не ниже {$locked->min_rating}");
            }

            $existing = $locked->participants()->whereKey($user->id)->first();
            if ($existing && $existing->pivot->status !== ParticipantStatus::Withdrawn->value) {
                throw new BusinessException('Вы уже подали заявку на этот турнир');
            }

            $active = $locked->participants()
                ->wherePivot('status', '!=', ParticipantStatus::Withdrawn->value)
                ->count();
            if ($active >= $locked->max_participants) {
                throw new BusinessException('Свободных мест на турнире нет');
            }

            $pivot = [
                'status' => ParticipantStatus::Pending->value,
                'rating_at_start' => $user->rating,
                'start_number' => null,
            ];

            $existing
                ? $locked->participants()->updateExistingPivot($user->id, $pivot)
                : $locked->participants()->attach($user->id, $pivot);

            Log::info('Подана заявка на турнир', ['tournament_id' => $locked->id, 'user_id' => $user->id]);

            return $locked->participants()->whereKey($user->id)->firstOrFail();
        });
    }

    public function withdraw(Tournament $tournament, User $user): User
    {
        $participant = $tournament->participants()->whereKey($user->id)->first();

        if (! $participant || $participant->pivot->status === ParticipantStatus::Withdrawn->value) {
            throw new BusinessException('Вы не зарегистрированы на этот турнир', 404);
        }

        if ($tournament->status !== TournamentStatus::Registration) {
            throw new BusinessException('Отозвать заявку можно только до начала турнира');
        }

        $tournament->participants()->updateExistingPivot($user->id, [
            'status' => ParticipantStatus::Withdrawn->value,
            'start_number' => null,
        ]);

        Log::info('Заявка отозвана', ['tournament_id' => $tournament->id, 'user_id' => $user->id]);

        return $tournament->participants()->whereKey($user->id)->firstOrFail();
    }

    /**
     * Организатор допускает игрока, отклоняет заявку или задаёт стартовый номер.
     *
     * @param  array{status?: string, start_number?: int|null}  $data
     */
    public function updateParticipant(Tournament $tournament, User $user, array $data): User
    {
        return DB::transaction(function () use ($tournament, $user, $data) {
            /** @var Tournament $locked */
            $locked = Tournament::whereKey($tournament->id)->lockForUpdate()->firstOrFail();

            $participant = $locked->participants()->whereKey($user->id)->first();
            if (! $participant) {
                throw new BusinessException('Игрок не подавал заявку на этот турнир', 404);
            }

            if (! in_array($locked->status, [TournamentStatus::Draft, TournamentStatus::Registration], true)) {
                throw new BusinessException('Состав участников можно менять только до начала турнира');
            }

            $newStatus = $data['status'] ?? $participant->pivot->status;
            if ($newStatus === ParticipantStatus::Confirmed->value
                && $participant->pivot->status !== ParticipantStatus::Confirmed->value) {
                $confirmed = $locked->confirmedParticipants()->count();
                if ($confirmed >= $locked->max_participants) {
                    throw new BusinessException('Достигнут лимит допущенных участников');
                }
            }

            $changes = ['status' => $newStatus];
            if (array_key_exists('start_number', $data)) {
                $changes['start_number'] = $data['start_number'];
            }
            if ($newStatus === ParticipantStatus::Withdrawn->value) {
                $changes['start_number'] = null;
            }

            $locked->participants()->updateExistingPivot($user->id, $changes);

            return $locked->participants()->whereKey($user->id)->firstOrFail();
        });
    }

    public function myTournaments(User $user): Collection
    {
        return $user->tournaments()
            ->with(['timeControl', 'organizer'])
            ->orderByDesc('start_date')
            ->get();
    }
}

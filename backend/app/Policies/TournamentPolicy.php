<?php

namespace App\Policies;

use App\Models\Tournament;
use App\Models\User;

/**
 * Проверка владельца: организатор управляет только своими турнирами,
 * администратор — всеми (метод before).
 */
class TournamentPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    public function update(User $user, Tournament $tournament): bool
    {
        return $this->isOwner($user, $tournament);
    }

    public function delete(User $user, Tournament $tournament): bool
    {
        return $this->isOwner($user, $tournament);
    }

    /** Управление участниками, турами, результатами, статусом и афишей. */
    public function manage(User $user, Tournament $tournament): bool
    {
        return $this->isOwner($user, $tournament);
    }

    private function isOwner(User $user, Tournament $tournament): bool
    {
        return $user->id === $tournament->user_id;
    }
}

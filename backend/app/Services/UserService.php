<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\BusinessException;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;

class UserService
{
    /** @param  array<string, mixed>  $params */
    public function list(array $params): LengthAwarePaginator
    {
        $search = $params['search'] ?? null;

        return User::query()
            ->when($params['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
            ->when($search, fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->orderBy('name')
            ->paginate((int) ($params['per_page'] ?? 20))
            ->withQueryString();
    }

    public function update(User $admin, User $user, array $data): User
    {
        if ($admin->id === $user->id && isset($data['role']) && $data['role'] !== UserRole::Admin->value) {
            throw new BusinessException('Нельзя снять роль администратора с самого себя');
        }

        $user->update($data);
        Log::info('Администратор изменил пользователя', ['admin_id' => $admin->id, 'user_id' => $user->id]);

        return $user;
    }

    public function delete(User $admin, User $user): void
    {
        if ($admin->id === $user->id) {
            throw new BusinessException('Нельзя удалить собственную учётную запись');
        }

        if ($user->organizedTournaments()->exists()) {
            throw new BusinessException('Пользователь организует турниры, удалить его нельзя');
        }

        if ($user->gamesAsWhite()->exists() || $user->gamesAsBlack()->exists()) {
            throw new BusinessException('У пользователя есть сыгранные партии, удалить его нельзя');
        }

        $user->tokens()->delete();
        $user->delete();
        Log::warning('Удалён пользователь', ['admin_id' => $admin->id, 'user_id' => $user->id]);
    }
}

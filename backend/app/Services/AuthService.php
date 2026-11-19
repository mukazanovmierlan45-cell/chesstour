<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\BusinessException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthService
{
    /**
     * Регистрация: роль всегда «игрок», пароль хешируется cast'ом 'hashed'.
     *
     * @param  array{name: string, email: string, password: string}  $data
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => UserRole::Player,
        ]);
        $user->refresh();

        Log::info('Зарегистрирован пользователь', ['user_id' => $user->id]);

        return ['user' => $user, 'token' => $user->createToken('api')->plainTextToken];
    }

    /**
     * @return array{user: User, token: string}
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            Log::warning('Неудачная попытка входа', ['email' => $email]);

            // Общее сообщение: не уточняем, что именно неверно
            throw new BusinessException('Неверный email или пароль', 401);
        }

        return ['user' => $user, 'token' => $user->createToken('api')->plainTextToken];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }
}

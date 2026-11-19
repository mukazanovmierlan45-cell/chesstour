<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_token(): void
    {
        $response = $this->postJson('/api/v1/register', [
            'name' => 'Новый Игрок',
            'email' => 'new@chess.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.role', 'player')
            ->assertJsonPath('data.email', 'new@chess.test')
            ->assertJsonStructure(['data' => ['id', 'name', 'role'], 'token'])
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', ['email' => 'new@chess.test', 'role' => 'player']);
        $this->assertNotSame('secret123', User::where('email', 'new@chess.test')->value('password'));
    }

    public function test_register_with_taken_email_returns_422(): void
    {
        User::factory()->create(['email' => 'taken@chess.test']);

        $this->postJson('/api/v1/register', [
            'name' => 'Дубль',
            'email' => 'taken@chess.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Ошибка валидации')
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_with_wrong_password_returns_401_with_generic_message(): void
    {
        User::factory()->create(['email' => 'player@chess.test']);

        $this->postJson('/api/v1/login', ['email' => 'player@chess.test', 'password' => 'wrong-pass'])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Неверный email или пароль');
    }

    public function test_login_returns_token(): void
    {
        User::factory()->create(['email' => 'player@chess.test']);

        $this->postJson('/api/v1/login', ['email' => 'player@chess.test', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'name'], 'token']);
    }

    public function test_protected_route_without_token_returns_401(): void
    {
        $this->getJson('/api/v1/user')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Требуется авторизация');
    }

    public function test_logout_deletes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/logout')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}

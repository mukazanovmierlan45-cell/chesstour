<?php

namespace Tests\Feature;

use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_can_register_for_tournament(): void
    {
        $tournament = Tournament::factory()->create();
        $player = User::factory()->create(['rating' => 1600]);
        Sanctum::actingAs($player);

        $this->postJson("/api/v1/tournaments/{$tournament->id}/registration")
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.rating_at_start', 1600);

        $this->assertDatabaseHas('tournament_user', [
            'tournament_id' => $tournament->id,
            'user_id' => $player->id,
            'status' => 'pending',
        ]);
    }

    public function test_registration_for_draft_tournament_returns_409(): void
    {
        $tournament = Tournament::factory()->draft()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/tournaments/{$tournament->id}/registration")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Регистрация на турнир закрыта');
    }

    public function test_registration_when_no_places_left_returns_409(): void
    {
        $tournament = Tournament::factory()->create(['max_participants' => 2]);
        foreach (User::factory()->count(2)->create() as $other) {
            $tournament->participants()->attach($other->id, ['status' => 'pending', 'rating_at_start' => 1500]);
        }
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/tournaments/{$tournament->id}/registration")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Свободных мест на турнире нет');
    }

    public function test_rating_below_minimum_returns_409(): void
    {
        $tournament = Tournament::factory()->create(['min_rating' => 1800]);
        Sanctum::actingAs(User::factory()->create(['rating' => 1500]));

        $this->postJson("/api/v1/tournaments/{$tournament->id}/registration")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Для участия нужен рейтинг не ниже 1800');
    }

    public function test_double_registration_returns_409(): void
    {
        $tournament = Tournament::factory()->create();
        $player = User::factory()->create();
        $tournament->participants()->attach($player->id, ['status' => 'pending', 'rating_at_start' => 1500]);
        Sanctum::actingAs($player);

        $this->postJson("/api/v1/tournaments/{$tournament->id}/registration")
            ->assertStatus(409);
    }

    public function test_organizer_cannot_register_as_player(): void
    {
        $tournament = Tournament::factory()->create();
        Sanctum::actingAs(User::factory()->organizer()->create());

        $this->postJson("/api/v1/tournaments/{$tournament->id}/registration")
            ->assertForbidden();
    }

    public function test_organizer_confirms_participant(): void
    {
        $tournament = Tournament::factory()->create();
        $player = User::factory()->create();
        $tournament->participants()->attach($player->id, ['status' => 'pending', 'rating_at_start' => 1500]);
        Sanctum::actingAs($tournament->organizer);

        $this->patchJson("/api/v1/tournaments/{$tournament->id}/participants/{$player->id}", [
            'status' => 'confirmed',
            'start_number' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.start_number', 1);
    }

    public function test_player_sees_only_own_registrations(): void
    {
        $mine = Tournament::factory()->create();
        $foreign = Tournament::factory()->create();
        $player = User::factory()->create();
        $other = User::factory()->create();
        $mine->participants()->attach($player->id, ['status' => 'pending', 'rating_at_start' => 1500]);
        $foreign->participants()->attach($other->id, ['status' => 'pending', 'rating_at_start' => 1500]);
        Sanctum::actingAs($player);

        $this->getJson('/api/v1/my/tournaments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }
}

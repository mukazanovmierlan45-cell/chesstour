<?php

namespace Tests\Feature;

use App\Enums\TournamentStatus;
use App\Models\TimeControl;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TournamentApiTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'time_control_id' => TimeControl::factory()->create()->id,
            'title' => 'Кубок весны',
            'format' => 'swiss',
            'location' => 'Шахматный клуб',
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(11)->toDateString(),
            'registration_deadline' => now()->addDays(9)->toDateTimeString(),
            'max_participants' => 16,
            'rounds_count' => 5,
        ], $overrides);
    }

    public function test_list_is_filtered_and_paginated(): void
    {
        Tournament::factory()->count(3)->create();
        Tournament::factory()->count(2)->draft()->create();

        $this->getJson('/api/v1/tournaments?status=registration&per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_search_finds_tournament_by_part_of_title(): void
    {
        Tournament::factory()->create(['title' => 'Мемориал Таля']);
        Tournament::factory()->count(2)->create(['title' => 'Обычный турнир']);

        $this->getJson('/api/v1/tournaments?search=Таля')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Мемориал Таля');
    }

    public function test_invalid_sort_field_is_rejected(): void
    {
        $this->getJson('/api/v1/tournaments?sort=password')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['sort']);
    }

    public function test_missing_tournament_returns_404(): void
    {
        $this->getJson('/api/v1/tournaments/999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Турнир не найден');
    }

    public function test_organizer_can_create_tournament(): void
    {
        $organizer = User::factory()->organizer()->create();
        Sanctum::actingAs($organizer);

        $this->postJson('/api/v1/tournaments', $this->payload())
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.organizer_id', $organizer->id);

        $this->assertDatabaseHas('tournaments', ['title' => 'Кубок весны', 'user_id' => $organizer->id]);
    }

    public function test_player_cannot_create_tournament(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/tournaments', $this->payload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Недостаточно прав для выполнения действия');
    }

    public function test_end_date_before_start_date_returns_422(): void
    {
        Sanctum::actingAs(User::factory()->organizer()->create());

        $this->postJson('/api/v1/tournaments', $this->payload([
            'end_date' => now()->addDays(5)->toDateString(),
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }

    public function test_organizer_cannot_update_foreign_tournament(): void
    {
        $tournament = Tournament::factory()->create();
        Sanctum::actingAs(User::factory()->organizer()->create());

        $this->patchJson("/api/v1/tournaments/{$tournament->id}", ['title' => 'Чужой'])
            ->assertForbidden();
    }

    public function test_admin_can_update_any_tournament(): void
    {
        $tournament = Tournament::factory()->create();
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->patchJson("/api/v1/tournaments/{$tournament->id}", ['title' => 'Новое название'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Новое название');
    }

    public function test_invalid_status_transition_returns_409(): void
    {
        $tournament = Tournament::factory()->draft()->create();
        Sanctum::actingAs($tournament->organizer);

        $this->patchJson("/api/v1/tournaments/{$tournament->id}/status", ['status' => 'finished'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Нельзя перевести турнир из статуса «Черновик» в «Завершён»');

        $this->assertSame(TournamentStatus::Draft, $tournament->fresh()->status);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Ключевой сценарий: жеребьёвка тура, ввод результатов, турнирная таблица.
 */
class RoundApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: Tournament, 1: \Illuminate\Support\Collection<int, User>} */
    private function ongoingTournament(int $players, string $format = 'swiss'): array
    {
        $tournament = Tournament::factory()->ongoing()->create(['format' => $format, 'rounds_count' => 3]);
        $users = User::factory()->count($players)->sequence(fn ($seq) => ['rating' => 2000 - $seq->index * 100])->create();

        foreach ($users as $index => $user) {
            $tournament->participants()->attach($user->id, [
                'status' => 'confirmed',
                'rating_at_start' => $user->rating,
                'start_number' => $index + 1,
            ]);
        }

        return [$tournament, $users];
    }

    public function test_full_round_scenario(): void
    {
        [$tournament, $users] = $this->ongoingTournament(4);
        Sanctum::actingAs($tournament->organizer);

        // 1. Жеребьёвка
        $round = $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds", ['auto_pairing' => true])
            ->assertStatus(201)
            ->assertJsonPath('data.number', 1)
            ->assertJsonCount(2, 'data.games')
            ->json('data');

        // 2. Тур нельзя завершить без результатов
        $this->postJson("/api/v1/rounds/{$round['id']}/complete")
            ->assertStatus(409);

        // 3. Ввод результатов: белые выигрывают обе партии
        foreach ($round['games'] as $game) {
            $this->patchJson("/api/v1/games/{$game['id']}", ['result' => 'white_win'])
                ->assertOk()
                ->assertJsonPath('data.result_notation', '1-0');
        }

        // 4. Завершение тура
        $this->postJson("/api/v1/rounds/{$round['id']}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        // 5. Турнирная таблица: у победителей по 1 очку
        $this->getJson("/api/v1/tournaments/{$tournament->id}/standings")
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.points', 1.0)
            ->assertJsonPath('data.3.points', 0.0);
    }

    public function test_cannot_create_next_round_until_previous_completed(): void
    {
        [$tournament] = $this->ongoingTournament(4);
        Sanctum::actingAs($tournament->organizer);

        $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds")->assertStatus(201);

        $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Сначала завершите тур №1');
    }

    public function test_odd_number_of_players_gets_bye(): void
    {
        [$tournament] = $this->ongoingTournament(5);
        Sanctum::actingAs($tournament->organizer);

        $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds")
            ->assertStatus(201)
            ->assertJsonCount(3, 'data.games')
            ->assertJsonPath('data.games.2.is_bye', true)
            ->assertJsonPath('data.games.2.result', 'bye');
    }

    public function test_round_robin_pairs_every_player_once_over_all_rounds(): void
    {
        [$tournament] = $this->ongoingTournament(4, 'round_robin');
        Sanctum::actingAs($tournament->organizer);

        for ($r = 1; $r <= 3; $r++) {
            $round = $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds")->assertStatus(201)->json('data');
            foreach ($round['games'] as $game) {
                $this->patchJson("/api/v1/games/{$game['id']}", ['result' => 'draw'])->assertOk();
            }
            $this->postJson("/api/v1/rounds/{$round['id']}/complete")->assertOk();
        }

        $pairs = Game::all()->map(function (Game $g) {
            $ids = [$g->white_player_id, $g->black_player_id];
            sort($ids);

            return implode('-', $ids);
        });

        $this->assertCount(6, $pairs);
        $this->assertCount(6, $pairs->unique());
    }

    public function test_manual_pairing_with_same_player_twice_returns_409(): void
    {
        [$tournament, $users] = $this->ongoingTournament(4);
        Sanctum::actingAs($tournament->organizer);

        $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds", [
            'auto_pairing' => false,
            'pairings' => [
                ['white_player_id' => $users[0]->id, 'black_player_id' => $users[1]->id],
                ['white_player_id' => $users[1]->id, 'black_player_id' => $users[2]->id],
            ],
        ])->assertStatus(409);

        $this->assertDatabaseCount('rounds', 0); // транзакция откатилась
    }

    public function test_player_cannot_enter_results(): void
    {
        [$tournament, $users] = $this->ongoingTournament(2);
        Sanctum::actingAs($tournament->organizer);
        $round = $this->postJson("/api/v1/tournaments/{$tournament->id}/rounds")->json('data');

        Sanctum::actingAs($users[0]);
        $this->patchJson("/api/v1/games/{$round['games'][0]['id']}", ['result' => 'white_win'])
            ->assertForbidden();
    }
}

<?php

namespace Database\Factories;

use App\Enums\GameResult;
use App\Models\Game;
use App\Models\Round;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Game>
 */
class GameFactory extends Factory
{
    public function definition(): array
    {
        return [
            'round_id' => Round::factory(),
            'white_player_id' => User::factory(),
            'black_player_id' => User::factory(),
            'board_number' => fake()->unique()->numberBetween(1, 1000),
            'result' => GameResult::Pending,
            'pgn' => null,
        ];
    }
}

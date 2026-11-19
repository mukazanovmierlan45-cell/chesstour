<?php

namespace Database\Factories;

use App\Enums\RoundStatus;
use App\Models\Round;
use App\Models\Tournament;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Round>
 */
class RoundFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tournament_id' => Tournament::factory()->ongoing(),
            'number' => 1,
            'starts_at' => now(),
            'status' => RoundStatus::Ongoing,
        ];
    }
}

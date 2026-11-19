<?php

namespace Database\Factories;

use App\Enums\TournamentFormat;
use App\Enums\TournamentStatus;
use App\Models\TimeControl;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tournament>
 */
class TournamentFactory extends Factory
{
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('+10 days', '+90 days');

        return [
            'user_id' => User::factory()->organizer(),
            'time_control_id' => TimeControl::factory(),
            'title' => fake()->randomElement(['Кубок', 'Мемориал', 'Открытый турнир', 'Первенство', 'Фестиваль'])
                .' «'.fake()->city().'»',
            'description' => fake()->realText(200),
            'format' => TournamentFormat::Swiss,
            'location' => fake()->city().', '.fake()->streetAddress(),
            'start_date' => $start->format('Y-m-d'),
            'end_date' => (clone $start)->modify('+1 day')->format('Y-m-d'),
            'registration_deadline' => (clone $start)->modify('-1 day')->format('Y-m-d 23:59:00'),
            'max_participants' => fake()->randomElement([8, 16, 24, 32]),
            'rounds_count' => fake()->numberBetween(5, 9),
            'min_rating' => null,
            'status' => TournamentStatus::Registration,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => TournamentStatus::Draft]);
    }

    public function ongoing(): static
    {
        return $this->state(fn () => [
            'status' => TournamentStatus::Ongoing,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'registration_deadline' => now()->subDay(),
        ]);
    }

    public function roundRobin(): static
    {
        return $this->state(fn () => ['format' => TournamentFormat::RoundRobin]);
    }
}

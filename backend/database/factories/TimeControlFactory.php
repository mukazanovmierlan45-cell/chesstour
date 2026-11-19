<?php

namespace Database\Factories;

use App\Enums\TimeControlType;
use App\Models\TimeControl;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimeControl>
 */
class TimeControlFactory extends Factory
{
    public function definition(): array
    {
        $type = fake()->randomElement(TimeControlType::cases());
        [$minutes, $increment] = match ($type) {
            TimeControlType::Classical => [fake()->randomElement([60, 90, 120]), 30],
            TimeControlType::Rapid => [fake()->randomElement([10, 15, 25]), fake()->randomElement([0, 5, 10])],
            TimeControlType::Blitz => [fake()->randomElement([3, 5]), fake()->randomElement([0, 2, 3])],
            TimeControlType::Bullet => [1, fake()->randomElement([0, 1])],
        };

        return [
            'name' => $type->label().' '.$minutes.'+'.$increment.' #'.fake()->unique()->numberBetween(1, 99999),
            'type' => $type,
            'base_minutes' => $minutes,
            'increment_seconds' => $increment,
        ];
    }
}

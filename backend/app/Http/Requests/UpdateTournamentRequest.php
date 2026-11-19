<?php

namespace App\Http\Requests;

use App\Enums\TournamentFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTournamentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Для сравнения дат берём значения из запроса, а если их нет — из турнира.
     */
    protected function prepareForValidation(): void
    {
        $tournament = $this->route('tournament');

        $this->merge([
            '_start_date' => $this->input('start_date', $tournament?->start_date?->toDateString()),
        ]);
    }

    public function rules(): array
    {
        return [
            'time_control_id' => ['sometimes', 'required', 'integer', 'exists:time_controls,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'format' => ['sometimes', 'required', Rule::enum(TournamentFormat::class)],
            'location' => ['sometimes', 'required', 'string', 'max:255'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:_start_date'],
            'registration_deadline' => ['sometimes', 'required', 'date', 'before_or_equal:_start_date'],
            'max_participants' => ['sometimes', 'required', 'integer', 'min:2', 'max:500'],
            'rounds_count' => ['sometimes', 'required', 'integer', 'min:1', 'max:20'],
            'min_rating' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:3500'],
        ];
    }

    public function messages(): array
    {
        return [
            'end_date.after_or_equal' => 'Дата окончания должна быть не раньше даты начала',
            'registration_deadline.before_or_equal' => 'Приём заявок должен закончиться не позже даты начала',
            'max_participants.min' => 'В турнире должно быть минимум 2 места',
        ];
    }
}

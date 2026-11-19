<?php

namespace App\Http\Requests;

use App\Enums\TournamentFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTournamentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'time_control_id' => ['required', 'integer', 'exists:time_controls,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'format' => ['required', Rule::enum(TournamentFormat::class)],
            'location' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'registration_deadline' => ['required', 'date', 'before_or_equal:start_date'],
            'max_participants' => ['required', 'integer', 'min:2', 'max:500'],
            'rounds_count' => ['required', 'integer', 'min:1', 'max:20'],
            'min_rating' => ['nullable', 'integer', 'min:0', 'max:3500'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_date.after_or_equal' => 'Дата начала не может быть в прошлом',
            'end_date.after_or_equal' => 'Дата окончания должна быть не раньше даты начала',
            'registration_deadline.before_or_equal' => 'Приём заявок должен закончиться не позже даты начала',
            'max_participants.min' => 'В турнире должно быть минимум 2 места',
        ];
    }
}

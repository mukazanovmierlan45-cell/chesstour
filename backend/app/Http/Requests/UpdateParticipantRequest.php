<?php

namespace App\Http\Requests;

use App\Enums\ParticipantStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateParticipantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tournament = $this->route('tournament');
        $user = $this->route('user');

        return [
            'status' => ['sometimes', 'required', Rule::enum(ParticipantStatus::class)],
            'start_number' => [
                'sometimes', 'nullable', 'integer', 'min:1', 'max:500',
                Rule::unique('tournament_user', 'start_number')
                    ->where('tournament_id', $tournament?->id)
                    ->whereNot('user_id', $user?->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'start_number.unique' => 'Этот стартовый номер уже занят',
        ];
    }
}

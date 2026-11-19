<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'starts_at' => ['nullable', 'date'],
            'auto_pairing' => ['sometimes', 'boolean'],
            'pairings' => ['exclude_if:auto_pairing,true', 'required_if:auto_pairing,false', 'array', 'min:1'],
            'pairings.*.white_player_id' => ['required', 'integer', 'exists:users,id'],
            'pairings.*.black_player_id' => ['nullable', 'integer', 'exists:users,id', 'different:pairings.*.white_player_id'],
        ];
    }

    public function messages(): array
    {
        return [
            'pairings.required_if' => 'Для ручной жеребьёвки передайте список пар',
            'pairings.*.black_player_id.different' => 'Игрок не может играть сам с собой',
        ];
    }
}

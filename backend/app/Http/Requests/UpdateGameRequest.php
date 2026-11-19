<?php

namespace App\Http\Requests;

use App\Enums\GameResult;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'result' => ['required', Rule::enum(GameResult::class)->except([GameResult::Bye])],
            'pgn' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }

    public function messages(): array
    {
        return [
            'result.enum' => 'Результат: pending, white_win, black_win или draw',
        ];
    }
}

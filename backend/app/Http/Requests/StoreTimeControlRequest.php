<?php

namespace App\Http\Requests;

use App\Enums\TimeControlType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTimeControlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'unique:time_controls,name'],
            'type' => ['required', Rule::enum(TimeControlType::class)],
            'base_minutes' => ['required', 'integer', 'min:1', 'max:300'],
            'increment_seconds' => ['sometimes', 'integer', 'min:0', 'max:180'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'Контроль времени с таким названием уже есть',
            'base_minutes.min' => 'Время на партию должно быть больше нуля',
        ];
    }
}

<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'messages' => ['required', 'array', 'min:1', 'max:20'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'messages.required' => 'Напишите сообщение',
            'messages.max' => 'Слишком длинная история диалога: не больше 20 сообщений',
            'messages.*.content.max' => 'Сообщение не должно превышать 2000 символов',
        ];
    }

    /** Последнее сообщение диалога должно быть от пользователя. */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $last = collect($this->input('messages', []))->last();
                if (is_array($last) && ($last['role'] ?? null) !== 'user') {
                    $validator->errors()->add('messages', 'Последнее сообщение должно быть от пользователя');
                }
            },
        ];
    }
}

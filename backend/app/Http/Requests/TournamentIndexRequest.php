<?php

namespace App\Http\Requests;

use App\Enums\TournamentFormat;
use App\Enums\TournamentStatus;
use App\Services\TournamentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Параметры фильтрации, поиска, сортировки и пагинации списка турниров.
 */
class TournamentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(TournamentStatus::class)],
            'format' => ['nullable', Rule::enum(TournamentFormat::class)],
            'time_control_id' => ['nullable', 'integer', 'exists:time_controls,id'],
            'organizer_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(TournamentService::SORTABLE)],
            'order' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}

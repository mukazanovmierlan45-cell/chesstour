<?php

namespace App\Http\Resources;

use App\Enums\ParticipantStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Участник турнира: пользователь + данные промежуточной таблицы. @mixin \App\Models\User */
class ParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $status = ParticipantStatus::from($this->pivot->status);

        return [
            'user' => new PlayerBriefResource($this->resource),
            'start_number' => $this->pivot->start_number,
            'rating_at_start' => (int) $this->pivot->rating_at_start,
            'status' => $status->value,
            'status_label' => $status->label(),
            'registered_at' => $this->pivot->created_at?->toIso8601String(),
        ];
    }
}

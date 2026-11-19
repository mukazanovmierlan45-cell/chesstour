<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TimeControl */
class TimeControlResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'base_minutes' => $this->base_minutes,
            'increment_seconds' => $this->increment_seconds,
            'short' => $this->shortLabel(),
            'tournaments_count' => $this->whenCounted('tournaments'),
        ];
    }
}

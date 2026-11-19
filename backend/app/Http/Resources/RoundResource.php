<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Round */
class RoundResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tournament_id' => $this->tournament_id,
            'number' => $this->number,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'games_count' => $this->whenCounted('games'),
            'games' => GameResource::collection($this->whenLoaded('games')),
        ];
    }
}

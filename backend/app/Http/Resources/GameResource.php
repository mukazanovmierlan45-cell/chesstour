<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Game */
class GameResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'round_id' => $this->round_id,
            'board_number' => $this->board_number,
            'white' => new PlayerBriefResource($this->whenLoaded('whitePlayer')),
            'black' => $this->whenLoaded('blackPlayer', fn () => $this->blackPlayer
                ? new PlayerBriefResource($this->blackPlayer)
                : null),
            'is_bye' => $this->isBye(),
            'result' => $this->result->value,
            'result_label' => $this->result->label(),
            'result_notation' => $this->result->notation(),
            'pgn' => $this->pgn,
            'round' => $this->whenLoaded('round', fn () => [
                'id' => $this->round->id,
                'number' => $this->round->number,
                'tournament' => $this->round->relationLoaded('tournament') ? [
                    'id' => $this->round->tournament->id,
                    'title' => $this->round->tournament->title,
                ] : null,
            ]),
        ];
    }
}

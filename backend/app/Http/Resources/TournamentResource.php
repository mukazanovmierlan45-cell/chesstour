<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\Tournament */
class TournamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'format' => $this->format->value,
            'format_label' => $this->format->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'location' => $this->location,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'registration_deadline' => $this->registration_deadline?->toIso8601String(),
            'is_registration_open' => $this->isRegistrationOpen(),
            'max_participants' => $this->max_participants,
            'rounds_count' => $this->rounds_count,
            'min_rating' => $this->min_rating,
            'poster_url' => $this->poster_path ? Storage::disk('public')->url($this->poster_path) : null,
            'organizer_id' => $this->user_id,
            'organizer' => new PlayerBriefResource($this->whenLoaded('organizer')),
            'time_control' => new TimeControlResource($this->whenLoaded('timeControl')),
            'participants_count' => $this->whenCounted('participants'),
            'rounds_created' => $this->whenCounted('rounds_created'),
            // Заявка текущего пользователя (есть, когда турнир получен через $user->tournaments())
            'my_registration' => $this->whenPivotLoaded('tournament_user', fn () => [
                'status' => $this->pivot->status,
                'start_number' => $this->pivot->start_number,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

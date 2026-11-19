<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    private bool $forceEmail = false;

    /** Показать email (ответы на регистрацию и вход — пользователь ещё не авторизован). */
    public function withEmail(): static
    {
        $this->forceEmail = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $canSeeEmail = $this->forceEmail || $viewer && ($viewer->id === $this->id || $viewer->isAdmin());

        return [
            'id' => $this->id,
            'name' => $this->name,
            // email виден только самому пользователю и администратору
            'email' => $this->when($canSeeEmail, $this->email),
            'role' => $this->role?->value,
            'role_label' => $this->role?->label(),
            'rating' => $this->rating,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

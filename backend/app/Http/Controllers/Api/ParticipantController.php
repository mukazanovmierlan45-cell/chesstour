<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateParticipantRequest;
use App\Http\Resources\ParticipantResource;
use App\Http\Resources\TournamentResource;
use App\Models\Tournament;
use App\Models\User;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ParticipantController extends Controller
{
    public function __construct(private readonly RegistrationService $service)
    {
    }

    /** GET /tournaments/{tournament}/participants?status= */
    public function index(Request $request, Tournament $tournament): AnonymousResourceCollection
    {
        $status = $request->query('status');
        if (! in_array($status, [null, 'pending', 'confirmed', 'withdrawn'], true)) {
            $status = null;
        }

        return ParticipantResource::collection($this->service->participants($tournament, $status));
    }

    /** POST /tournaments/{tournament}/registration — игрок подаёт заявку */
    public function register(Request $request, Tournament $tournament): JsonResponse
    {
        $participant = $this->service->register($tournament, $request->user());

        return (new ParticipantResource($participant))->response()->setStatusCode(201);
    }

    /** DELETE /tournaments/{tournament}/registration — игрок отзывает заявку */
    public function withdraw(Request $request, Tournament $tournament): ParticipantResource
    {
        return new ParticipantResource($this->service->withdraw($tournament, $request->user()));
    }

    /** PATCH /tournaments/{tournament}/participants/{user} — организатор допускает игрока */
    public function update(UpdateParticipantRequest $request, Tournament $tournament, User $user): ParticipantResource
    {
        Gate::authorize('manage', $tournament);

        return new ParticipantResource($this->service->updateParticipant($tournament, $user, $request->validated()));
    }

    /** GET /my/tournaments — только свои заявки */
    public function myTournaments(Request $request): AnonymousResourceCollection
    {
        return TournamentResource::collection($this->service->myTournaments($request->user()));
    }
}

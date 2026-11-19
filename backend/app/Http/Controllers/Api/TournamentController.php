<?php

namespace App\Http\Controllers\Api;

use App\Enums\TournamentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangeTournamentStatusRequest;
use App\Http\Requests\StoreTournamentRequest;
use App\Http\Requests\TournamentIndexRequest;
use App\Http\Requests\UpdateTournamentRequest;
use App\Http\Requests\UploadPosterRequest;
use App\Http\Resources\TournamentResource;
use App\Models\Tournament;
use App\Services\StandingsService;
use App\Services\TournamentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class TournamentController extends Controller
{
    public function __construct(
        private readonly TournamentService $service,
        private readonly StandingsService $standings,
    ) {
    }

    /** GET /tournaments?status=&format=&time_control_id=&date_from=&date_to=&search=&sort=&order=&per_page= */
    public function index(TournamentIndexRequest $request): AnonymousResourceCollection
    {
        return TournamentResource::collection($this->service->list($request->validated()));
    }

    public function store(StoreTournamentRequest $request): JsonResponse
    {
        $tournament = $this->service->create($request->user(), $request->validated());

        return (new TournamentResource($tournament))->response()->setStatusCode(201);
    }

    public function show(Tournament $tournament): TournamentResource
    {
        return new TournamentResource($this->service->load($tournament));
    }

    public function update(UpdateTournamentRequest $request, Tournament $tournament): TournamentResource
    {
        Gate::authorize('update', $tournament);

        return new TournamentResource($this->service->update($tournament, $request->validated()));
    }

    public function destroy(Tournament $tournament): Response
    {
        Gate::authorize('delete', $tournament);
        $this->service->delete($tournament);

        return response()->noContent();
    }

    /** PATCH /tournaments/{tournament}/status */
    public function changeStatus(ChangeTournamentStatusRequest $request, Tournament $tournament): TournamentResource
    {
        Gate::authorize('manage', $tournament);
        $status = TournamentStatus::from($request->validated('status'));

        return new TournamentResource($this->service->changeStatus($tournament, $status));
    }

    /** POST /tournaments/{tournament}/poster (multipart/form-data) */
    public function uploadPoster(UploadPosterRequest $request, Tournament $tournament): TournamentResource
    {
        Gate::authorize('manage', $tournament);

        return new TournamentResource($this->service->uploadPoster($tournament, $request->file('poster')));
    }

    /** GET /tournaments/{tournament}/standings — турнирная таблица */
    public function standings(Tournament $tournament): JsonResponse
    {
        // очки и Бухгольц всегда дробные (1.0, 2.5): без флага json_encode отдал бы 1 вместо 1.0,
        // и тип поля зависел бы от результата
        return response()->json(['data' => $this->standings->forTournament($tournament)], 200, [], JSON_PRESERVE_ZERO_FRACTION);
    }
}

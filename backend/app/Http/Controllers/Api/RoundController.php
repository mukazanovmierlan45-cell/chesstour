<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoundRequest;
use App\Http\Resources\RoundResource;
use App\Models\Round;
use App\Models\Tournament;
use App\Services\RoundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class RoundController extends Controller
{
    public function __construct(private readonly RoundService $service)
    {
    }

    /** GET /tournaments/{tournament}/rounds — туры с партиями */
    public function index(Tournament $tournament): AnonymousResourceCollection
    {
        return RoundResource::collection($this->service->list($tournament));
    }

    public function show(Round $round): RoundResource
    {
        return new RoundResource($this->service->load($round));
    }

    /** POST /tournaments/{tournament}/rounds — новый тур с жеребьёвкой */
    public function store(StoreRoundRequest $request, Tournament $tournament): JsonResponse
    {
        Gate::authorize('manage', $tournament);

        $data = $request->validated();
        $data['auto_pairing'] = $request->boolean('auto_pairing', true);

        return (new RoundResource($this->service->create($tournament, $data)))
            ->response()
            ->setStatusCode(201);
    }

    /** POST /rounds/{round}/complete */
    public function complete(Round $round): RoundResource
    {
        Gate::authorize('manage', $round->tournament);

        return new RoundResource($this->service->complete($round));
    }

    public function destroy(Round $round): Response
    {
        Gate::authorize('manage', $round->tournament);
        $this->service->delete($round);

        return response()->noContent();
    }
}

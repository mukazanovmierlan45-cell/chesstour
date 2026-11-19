<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateGameRequest;
use App\Http\Resources\GameResource;
use App\Models\Game;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class GameController extends Controller
{
    public function __construct(private readonly GameService $service)
    {
    }

    /** PATCH /games/{game} — внести результат */
    public function update(UpdateGameRequest $request, Game $game): GameResource
    {
        Gate::authorize('manage', $game->round->tournament);

        return new GameResource($this->service->recordResult($game, $request->validated()));
    }

    /** GET /my/games — партии текущего игрока */
    public function myGames(Request $request): AnonymousResourceCollection
    {
        return GameResource::collection($this->service->myGames($request->user()));
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTimeControlRequest;
use App\Http\Requests\UpdateTimeControlRequest;
use App\Http\Resources\TimeControlResource;
use App\Models\TimeControl;
use App\Services\TimeControlService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TimeControlController extends Controller
{
    public function __construct(private readonly TimeControlService $service)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return TimeControlResource::collection($this->service->list());
    }

    public function store(StoreTimeControlRequest $request)
    {
        return (new TimeControlResource($this->service->create($request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TimeControl $timeControl): TimeControlResource
    {
        return new TimeControlResource($timeControl->loadCount('tournaments'));
    }

    public function update(UpdateTimeControlRequest $request, TimeControl $timeControl): TimeControlResource
    {
        return new TimeControlResource($this->service->update($timeControl, $request->validated()));
    }

    public function destroy(TimeControl $timeControl): Response
    {
        $this->service->delete($timeControl);

        return response()->noContent();
    }
}

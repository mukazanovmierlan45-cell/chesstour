<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UserIndexRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/** Управление пользователями — только администратор. */
class UserController extends Controller
{
    public function __construct(private readonly UserService $service)
    {
    }

    public function index(UserIndexRequest $request): AnonymousResourceCollection
    {
        return UserResource::collection($this->service->list($request->validated()));
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        return new UserResource($this->service->update($request->user(), $user, $request->validated()));
    }

    public function destroy(Request $request, User $user): Response
    {
        $this->service->delete($request->user(), $user);

        return response()->noContent();
    }
}

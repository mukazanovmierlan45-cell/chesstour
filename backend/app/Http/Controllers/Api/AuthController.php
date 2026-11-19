<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    /** POST /api/v1/register — 201 */
    public function register(RegisterRequest $request): JsonResponse
    {
        ['user' => $user, 'token' => $token] = $this->auth->register($request->validated());

        return response()->json([
            'data' => (new UserResource($user))->withEmail(),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /** POST /api/v1/login — 200 или 401 */
    public function login(LoginRequest $request): JsonResponse
    {
        ['user' => $user, 'token' => $token] = $this->auth->login(
            $request->validated('email'),
            $request->validated('password'),
        );

        return response()->json([
            'data' => (new UserResource($user))->withEmail(),
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /** POST /api/v1/logout — 204 */
    public function logout(Request $request): Response
    {
        $this->auth->logout($request->user());

        return response()->noContent();
    }

    /** GET /api/v1/user — текущий пользователь */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}

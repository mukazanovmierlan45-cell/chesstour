<?php

use App\Exceptions\BusinessException;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\LogApiRequests;
use App\Models\Game;
use App\Models\Round;
use App\Models\TimeControl;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        $middleware->api(append: [
            LogApiRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isApi = fn (Request $request) => $request->is('api/*') || $request->expectsJson();

        // Ошибки валидации: 422 + errors по полям
        $exceptions->render(function (ValidationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => 'Ошибка валидации',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        // Нарушение бизнес-правила: 409 (или код, заданный в исключении)
        $exceptions->render(function (BusinessException $e, Request $request) {
            return response()->json(['message' => $e->getMessage()], $e->status());
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Требуется авторизация'], 401);
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Недостаточно прав для выполнения действия'], 403);
            }
        });

        // Запись не найдена: понятное сообщение по типу модели
        $exceptions->render(function (NotFoundHttpException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            $previous = $e->getPrevious();
            $message = 'Ресурс не найден';

            if ($previous instanceof ModelNotFoundException) {
                $message = match ($previous->getModel()) {
                    Tournament::class => 'Турнир не найден',
                    Round::class => 'Тур не найден',
                    Game::class => 'Партия не найдена',
                    TimeControl::class => 'Контроль времени не найден',
                    User::class => 'Пользователь не найден',
                    default => 'Запись не найдена',
                };
            }

            return response()->json(['message' => $message], 404);
        });

        // Удаление записи, на которую ссылаются другие (FOREIGN KEY RESTRICT)
        $exceptions->render(function (QueryException $e, Request $request) use ($isApi) {
            if ($isApi($request) && ($e->errorInfo[0] ?? null) === '23000') {
                return response()->json([
                    'message' => 'Операция невозможна: запись используется в других данных',
                ], 409);
            }
        });

        // Прочие HTTP-ошибки (405, 429 и т. д.)
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            $messages = [
                405 => 'Метод не поддерживается для этого адреса',
                419 => 'Сессия истекла',
                429 => 'Слишком много запросов, попробуйте позже',
            ];

            return response()->json(
                ['message' => $messages[$e->getStatusCode()] ?? 'Ошибка запроса'],
                $e->getStatusCode(),
                $e->getHeaders(),
            );
        });

        // Непредвиденная ошибка: 500 без стека и SQL, если APP_DEBUG=false
        $exceptions->render(function (\Throwable $e, Request $request) use ($isApi) {
            if ($e instanceof HttpResponseException) {
                return null;
            }

            if ($isApi($request) && ! config('app.debug')) {
                return response()->json(['message' => 'Внутренняя ошибка сервера'], 500);
            }
        });
    })->create();

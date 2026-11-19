<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Журнал запросов к API: метод, URL, пользователь, код ответа, время.
 * Тело запроса не пишется, поэтому пароли и токены в журнал не попадают.
 */
class LogApiRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = microtime(true);

        $response = $next($request);

        Log::channel(config('logging.api_channel', config('logging.default')))->info('API запрос', [
            'method' => $request->method(),
            'url' => $request->path(),
            'user_id' => $request->user()?->id,
            'status' => $response->getStatusCode(),
            'duration_ms' => round((microtime(true) - $startedAt) * 1000, 1),
            'ip' => $request->ip(),
        ]);

        return $response;
    }
}

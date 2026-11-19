<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    | Домены SPA с cookie-аутентификацией. Клиент проекта работает по
    | Bearer-токену, поэтому этот список на него не влияет.
    */
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        Sanctum::currentApplicationUrlWithPort(),
    ))),

    'guard' => ['web'],

    /*
    | ПР8: время жизни токена в минутах (по умолчанию 24 часа).
    */
    'expiration' => (int) env('SANCTUM_EXPIRATION', 1440),

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];

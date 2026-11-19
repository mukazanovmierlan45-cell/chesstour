<?php

/*
| ПР11: CORS для клиента на отдельном адресе.
| Источник клиента задаётся в .env (CORS_ALLOWED_ORIGINS), «*» не используется.
| Авторизация по Bearer-токену, поэтому supports_credentials = false.
*/

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', 'http://127.0.0.1:5500,http://localhost:5500'))
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];

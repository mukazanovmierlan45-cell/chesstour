<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StatsService;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    /** GET /stats/overview — агрегированная статистика */
    public function overview(StatsService $stats): JsonResponse
    {
        return response()->json(['data' => $stats->overview()]);
    }
}

<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\RoundController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\TimeControlController;
use App\Http\Controllers\Api\TournamentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
| ПР4: проверка работоспособности. 200 — БД доступна, 503 — нет.
*/
Route::get('/health', function () {
    $payload = [
        'app' => config('app.name'),
        'time' => now()->toIso8601String(),
    ];

    try {
        DB::select('select 1');

        return response()->json($payload + ['database' => 'ok']);
    } catch (\Throwable $e) {
        report($e);

        return response()->json($payload + ['database' => 'unavailable'], 503);
    }
})->name('health');

Route::prefix('v1')->name('api.v1.')->group(function () {

    // ---------- Гость ----------
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->name('auth.register');
        Route::post('login', [AuthController::class, 'login'])->name('auth.login');
    });

    Route::apiResource('tournaments', TournamentController::class)->only(['index', 'show']);
    Route::get('tournaments/{tournament}/participants', [ParticipantController::class, 'index'])
        ->name('tournaments.participants.index');
    Route::get('tournaments/{tournament}/rounds', [RoundController::class, 'index'])
        ->name('tournaments.rounds.index');
    Route::get('tournaments/{tournament}/standings', [TournamentController::class, 'standings'])
        ->name('tournaments.standings');
    Route::get('rounds/{round}', [RoundController::class, 'show'])->name('rounds.show');
    Route::apiResource('time-controls', TimeControlController::class)->only(['index', 'show']);

    // ---------- Авторизованный пользователь ----------
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('user', [AuthController::class, 'me'])->name('auth.me');

        Route::get('my/tournaments', [ParticipantController::class, 'myTournaments'])->name('my.tournaments');
        Route::get('my/games', [GameController::class, 'myGames'])->name('my.games');

        // Игрок: заявка на турнир (ключевой сценарий)
        Route::middleware('role:player')->group(function () {
            Route::post('tournaments/{tournament}/registration', [ParticipantController::class, 'register'])
                ->name('tournaments.registration.store');
            Route::delete('tournaments/{tournament}/registration', [ParticipantController::class, 'withdraw'])
                ->name('tournaments.registration.destroy');
        });

        // Организатор и администратор; владелец турнира проверяется политикой
        Route::middleware('role:organizer,admin')->group(function () {
            Route::apiResource('tournaments', TournamentController::class)->except(['index', 'show']);
            Route::patch('tournaments/{tournament}/status', [TournamentController::class, 'changeStatus'])
                ->name('tournaments.status');
            Route::post('tournaments/{tournament}/poster', [TournamentController::class, 'uploadPoster'])
                ->name('tournaments.poster');
            Route::patch('tournaments/{tournament}/participants/{user}', [ParticipantController::class, 'update'])
                ->name('tournaments.participants.update');
            Route::post('tournaments/{tournament}/rounds', [RoundController::class, 'store'])
                ->name('tournaments.rounds.store');
            Route::post('rounds/{round}/complete', [RoundController::class, 'complete'])->name('rounds.complete');
            Route::delete('rounds/{round}', [RoundController::class, 'destroy'])->name('rounds.destroy');
            Route::patch('games/{game}', [GameController::class, 'update'])->name('games.update');
        });

        // Администратор: справочники, пользователи, статистика
        Route::middleware('role:admin')->group(function () {
            Route::apiResource('time-controls', TimeControlController::class)->except(['index', 'show']);
            Route::get('users', [UserController::class, 'index'])->name('users.index');
            Route::patch('users/{user}', [UserController::class, 'update'])->name('users.update');
            Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
            Route::get('stats/overview', [StatsController::class, 'overview'])->name('stats.overview');
        });
    });
});

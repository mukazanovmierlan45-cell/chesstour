<?php

namespace App\Models;

use App\Enums\GameResult;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'white_player_id',
        'black_player_id',
        'board_number',
        'result',
        'pgn',
    ];

    protected $attributes = [
        'result' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'result' => GameResult::class,
            'board_number' => 'integer',
            'round_id' => 'integer',
            'white_player_id' => 'integer',
            'black_player_id' => 'integer',
        ];
    }

    public function round(): BelongsTo
    {
        return $this->belongsTo(Round::class);
    }

    public function whitePlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'white_player_id');
    }

    public function blackPlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'black_player_id');
    }

    public function isBye(): bool
    {
        return $this->black_player_id === null;
    }

    /** Очки, которые партия принесла указанному игроку. */
    public function pointsFor(int $userId): float
    {
        if ($this->white_player_id === $userId) {
            return $this->result->whitePoints();
        }

        if ($this->black_player_id === $userId) {
            return $this->result->blackPoints();
        }

        return 0.0;
    }

    public function opponentOf(int $userId): ?int
    {
        return $this->white_player_id === $userId ? $this->black_player_id : $this->white_player_id;
    }
}

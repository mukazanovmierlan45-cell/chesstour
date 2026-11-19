<?php

namespace App\Models;

use App\Enums\TimeControlType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TimeControl extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'base_minutes',
        'increment_seconds',
    ];

    protected function casts(): array
    {
        return [
            'type' => TimeControlType::class,
            'base_minutes' => 'integer',
            'increment_seconds' => 'integer',
        ];
    }

    public function tournaments(): HasMany
    {
        return $this->hasMany(Tournament::class);
    }

    /** Короткая запись контроля, например «3+2». */
    public function shortLabel(): string
    {
        return "{$this->base_minutes}+{$this->increment_seconds}";
    }
}

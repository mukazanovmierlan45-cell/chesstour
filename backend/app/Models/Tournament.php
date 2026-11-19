<?php

namespace App\Models;

use App\Enums\ParticipantStatus;
use App\Enums\TournamentStatus;
use App\Enums\TournamentFormat;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Tournament extends Model
{
    use HasFactory;

    /**
     * user_id (организатор) и status не заполняются массово:
     * организатор берётся из токена, статус меняется только через сервис.
     */
    protected $fillable = [
        'time_control_id',
        'title',
        'description',
        'format',
        'location',
        'start_date',
        'end_date',
        'registration_deadline',
        'max_participants',
        'rounds_count',
        'min_rating',
    ];

    protected $attributes = [
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'time_control_id' => 'integer',
            'format' => TournamentFormat::class,
            'status' => TournamentStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'registration_deadline' => 'datetime',
            'max_participants' => 'integer',
            'rounds_count' => 'integer',
            'min_rating' => 'integer',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function timeControl(): BelongsTo
    {
        return $this->belongsTo(TimeControl::class);
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('start_number', 'rating_at_start', 'status')
            ->withTimestamps();
    }

    public function confirmedParticipants(): BelongsToMany
    {
        return $this->participants()->wherePivot('status', ParticipantStatus::Confirmed->value);
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class)->orderBy('number');
    }

    public function games(): HasManyThrough
    {
        return $this->hasManyThrough(Game::class, Round::class);
    }

    public function isRegistrationOpen(): bool
    {
        return $this->status === TournamentStatus::Registration
            && now()->lessThanOrEqualTo($this->registration_deadline);
    }

    /**
     * Локальный скоуп фильтрации списка турниров.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status))
            ->when($filters['format'] ?? null, fn (Builder $q, $format) => $q->where('format', $format))
            ->when($filters['time_control_id'] ?? null, fn (Builder $q, $id) => $q->where('time_control_id', $id))
            ->when($filters['organizer_id'] ?? null, fn (Builder $q, $id) => $q->where('user_id', $id))
            ->when($filters['date_from'] ?? null, fn (Builder $q, $from) => $q->whereDate('start_date', '>=', $from))
            ->when($filters['date_to'] ?? null, fn (Builder $q, $to) => $q->whereDate('start_date', '<=', $to));
    }

    /** Поиск по части названия или места проведения. */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if ($term === null || trim($term) === '') {
            return $query;
        }

        $like = '%'.trim($term).'%';

        return $query->where(fn (Builder $q) => $q
            ->where('title', 'like', $like)
            ->orWhere('location', 'like', $like));
    }
}

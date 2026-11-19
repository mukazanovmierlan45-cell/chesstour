<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\TimeControl;
use Illuminate\Database\Eloquent\Collection;

class TimeControlService
{
    public function list(): Collection
    {
        return TimeControl::withCount('tournaments')
            ->orderBy('base_minutes')
            ->orderBy('increment_seconds')
            ->get();
    }

    public function create(array $data): TimeControl
    {
        return TimeControl::create($data);
    }

    public function update(TimeControl $timeControl, array $data): TimeControl
    {
        $timeControl->update($data);

        return $timeControl;
    }

    public function delete(TimeControl $timeControl): void
    {
        if ($timeControl->tournaments()->exists()) {
            throw new BusinessException('Контроль времени используется в турнирах, удалить его нельзя');
        }

        $timeControl->delete();
    }
}

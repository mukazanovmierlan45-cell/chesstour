<?php

namespace Database\Seeders;

use App\Enums\GameResult;
use App\Enums\ParticipantStatus;
use App\Enums\RoundStatus;
use App\Enums\TimeControlType;
use App\Enums\TournamentFormat;
use App\Enums\TournamentStatus;
use App\Enums\UserRole;
use App\Models\Round;
use App\Models\TimeControl;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Тестовые данные. Пароль у всех учётных записей: password
 *   admin@chess.test      — администратор
 *   organizer@chess.test  — организатор
 *   player@chess.test     — игрок
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---------- Пользователи ----------
        $this->user('Администратор Системы', 'admin@chess.test', UserRole::Admin, 1200);
        $erzhan = $this->user('Ержан Сапаров', 'organizer@chess.test', UserRole::Organizer, 2010);
        $aigerim = $this->user('Айгерим Нурланова', 'aigerim@chess.test', UserRole::Organizer, 1900);

        $daniyar = $this->user('Данияр Ахметов', 'player@chess.test', UserRole::Player, 1850);
        $aliya = $this->user('Алия Касымова', 'aliya@chess.test', UserRole::Player, 1720);
        $timur = $this->user('Тимур Беков', 'timur@chess.test', UserRole::Player, 1640);
        $madina = $this->user('Мадина Оразбаева', 'madina@chess.test', UserRole::Player, 1580);
        $ruslan = $this->user('Руслан Жумабаев', 'ruslan@chess.test', UserRole::Player, 1450);
        $asel = $this->user('Асель Тулегенова', 'asel@chess.test', UserRole::Player, 1390);

        $extraPlayers = User::factory()->count(8)->create();

        // ---------- Контроли времени ----------
        $classic = $this->timeControl('Классика 90+30', TimeControlType::Classical, 90, 30);
        $rapid15 = $this->timeControl('Рапид 15+10', TimeControlType::Rapid, 15, 10);
        $rapid10 = $this->timeControl('Рапид 10+5', TimeControlType::Rapid, 10, 5);
        $blitz = $this->timeControl('Блиц 3+2', TimeControlType::Blitz, 3, 2);
        $this->timeControl('Пуля 1+0', TimeControlType::Bullet, 1, 0);

        // ---------- 1. Завершённый круговой турнир ----------
        $autumn = $this->tournament($erzhan, $rapid15, [
            'title' => 'Осенний кубок',
            'description' => 'Круговой турнир по рапиду для 4 сильнейших игроков клуба.',
            'format' => TournamentFormat::RoundRobin,
            'location' => 'Шахматный клуб, ул. Абая 10',
            'start' => now()->subDays(40),
            'days' => 1,
            'max_participants' => 4,
            'rounds_count' => 3,
            'status' => TournamentStatus::Finished,
        ]);
        $this->participants($autumn, [$daniyar, $aliya, $timur, $madina], ParticipantStatus::Confirmed);

        $this->round($autumn, 1, RoundStatus::Completed, [
            [$daniyar, $madina, GameResult::WhiteWin],
            [$aliya, $timur, GameResult::Draw],
        ]);
        $this->round($autumn, 2, RoundStatus::Completed, [
            [$timur, $daniyar, GameResult::BlackWin],
            [$madina, $aliya, GameResult::BlackWin],
        ]);
        $this->round($autumn, 3, RoundStatus::Completed, [
            [$daniyar, $aliya, GameResult::Draw],
            [$timur, $madina, GameResult::WhiteWin],
        ]);

        // ---------- 2. Идущий турнир по швейцарской системе ----------
        $arena = $this->tournament($aigerim, $blitz, [
            'title' => 'Блиц-арена',
            'description' => 'Еженедельный турнир по блицу, швейцарская система.',
            'format' => TournamentFormat::Swiss,
            'location' => 'Онлайн',
            'start' => now()->subDay(),
            'days' => 2,
            'max_participants' => 16,
            'rounds_count' => 5,
            'status' => TournamentStatus::Ongoing,
        ]);
        $this->participants($arena, [$daniyar, $aliya, $timur, $ruslan, $asel], ParticipantStatus::Confirmed);

        $this->round($arena, 1, RoundStatus::Completed, [
            [$daniyar, $asel, GameResult::WhiteWin],
            [$aliya, $ruslan, GameResult::Draw],
            [$timur, null, GameResult::Bye],
        ]);
        $this->round($arena, 2, RoundStatus::Ongoing, [
            [$timur, $daniyar, GameResult::Pending],
            [$aliya, $asel, GameResult::Pending],
            [$ruslan, null, GameResult::Bye],
        ]);

        // ---------- 3. Регистрация открыта, допуск по рейтингу ----------
        $championship = $this->tournament($erzhan, $classic, [
            'title' => 'Классический чемпионат города',
            'description' => 'Отборочный турнир, допуск с рейтингом от 1500.',
            'format' => TournamentFormat::Swiss,
            'location' => 'Дворец школьников',
            'start' => now()->addDays(23),
            'days' => 8,
            'deadline_days_before' => 7,
            'max_participants' => 32,
            'rounds_count' => 9,
            'min_rating' => 1500,
            'status' => TournamentStatus::Registration,
        ]);
        $this->participants($championship, [$daniyar], ParticipantStatus::Confirmed);
        $this->participants($championship, [$aliya, $madina], ParticipantStatus::Pending);
        $this->participants(
            $championship,
            $extraPlayers->filter(fn (User $u) => $u->rating >= 1500)->take(4)->all(),
            ParticipantStatus::Pending,
        );

        // ---------- 4. Черновик ----------
        $this->tournament($aigerim, $rapid10, [
            'title' => 'Турнир выходного дня',
            'description' => null,
            'format' => TournamentFormat::Swiss,
            'location' => 'Шахматный клуб, ул. Абая 10',
            'start' => now()->addDays(58),
            'days' => 1,
            'max_participants' => 24,
            'rounds_count' => 7,
            'status' => TournamentStatus::Draft,
        ]);

        // ---------- 5. Регистрация, есть отозванная заявка ----------
        $newYear = $this->tournament($erzhan, $blitz, [
            'title' => 'Новогодний блиц',
            'description' => 'Праздничный блиц-турнир.',
            'format' => TournamentFormat::Swiss,
            'location' => 'Онлайн',
            'start' => now()->addDays(39),
            'days' => 0,
            'max_participants' => 20,
            'rounds_count' => 7,
            'status' => TournamentStatus::Registration,
        ]);
        $this->participants($newYear, [$ruslan], ParticipantStatus::Pending);
        $this->participants($newYear, [$asel], ParticipantStatus::Withdrawn);
        $this->participants($newYear, $extraPlayers->take(5)->all(), ParticipantStatus::Pending);

        // ---------- 6–8. Ещё турниры для фильтрации и пагинации ----------
        Tournament::factory()->count(3)->sequence(
            ['user_id' => $erzhan->id, 'time_control_id' => $rapid15->id],
            ['user_id' => $aigerim->id, 'time_control_id' => $blitz->id],
            ['user_id' => $erzhan->id, 'time_control_id' => $classic->id, 'format' => TournamentFormat::RoundRobin],
        )->create();

        $this->command?->info('Готово. Вход: admin@chess.test / organizer@chess.test / player@chess.test, пароль password');
    }

    private function user(string $name, string $email, UserRole $role, int $rating): User
    {
        return User::factory()->create([
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'rating' => $rating,
        ]);
    }

    private function timeControl(string $name, TimeControlType $type, int $minutes, int $increment): TimeControl
    {
        return TimeControl::create([
            'name' => $name,
            'type' => $type,
            'base_minutes' => $minutes,
            'increment_seconds' => $increment,
        ]);
    }

    /** @param  array<string, mixed>  $data */
    private function tournament(User $organizer, TimeControl $timeControl, array $data): Tournament
    {
        $start = $data['start']->copy()->startOfDay();
        $deadlineDays = $data['deadline_days_before'] ?? 1;

        $tournament = new Tournament([
            'time_control_id' => $timeControl->id,
            'title' => $data['title'],
            'description' => $data['description'],
            'format' => $data['format'],
            'location' => $data['location'],
            'start_date' => $start->toDateString(),
            'end_date' => $start->copy()->addDays($data['days'])->toDateString(),
            'registration_deadline' => $start->copy()->subDays($deadlineDays)->setTime(23, 59),
            'max_participants' => $data['max_participants'],
            'rounds_count' => $data['rounds_count'],
            'min_rating' => $data['min_rating'] ?? null,
        ]);
        $tournament->user_id = $organizer->id;
        $tournament->status = $data['status'];
        $tournament->save();

        return $tournament;
    }

    /** @param  array<int, User>  $players */
    private function participants(Tournament $tournament, array $players, ParticipantStatus $status): void
    {
        $number = (int) $tournament->participants()->max('tournament_user.start_number');

        foreach ($players as $player) {
            $tournament->participants()->attach($player->id, [
                'status' => $status->value,
                'rating_at_start' => $player->rating,
                'start_number' => $status === ParticipantStatus::Confirmed ? ++$number : null,
            ]);
        }
    }

    /** @param  array<int, array{0: User, 1: User|null, 2: GameResult}>  $games */
    private function round(Tournament $tournament, int $number, RoundStatus $status, array $games): Round
    {
        $round = $tournament->rounds()->create([
            'number' => $number,
            'starts_at' => $tournament->start_date->copy()->setTime(10 + ($number - 1) * 3, 0),
            'status' => $status,
        ]);

        foreach ($games as $board => [$white, $black, $result]) {
            $round->games()->create([
                'white_player_id' => $white->id,
                'black_player_id' => $black?->id,
                'board_number' => $board + 1,
                'result' => $result,
            ]);
        }

        return $round;
    }
}

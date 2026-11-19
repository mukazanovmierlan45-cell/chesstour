<?php

namespace App\Services;

use App\Enums\TournamentStatus;
use App\Exceptions\AiServiceException;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Чат с ИИ-ассистентом клуба «Гамбит-бот» через Google Gemini (generateContent).
 * История диалога хранится на клиенте и передаётся целиком; сервер добавляет
 * системную инструкцию с актуальными турнирами клуба из базы данных.
 */
class AiChatService
{
    private const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    public function reply(User $user, array $messages): string
    {
        $key = config('services.gemini.key');
        if (! $key) {
            throw new AiServiceException('ИИ-ассистент не настроен: укажите GEMINI_API_KEY в .env');
        }

        $payload = [
            'system_instruction' => ['parts' => [['text' => $this->systemPrompt($user)]]],
            'contents' => array_map(fn (array $m) => [
                'role' => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ], $messages),
            'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => 800],
        ];

        try {
            $response = Http::withHeaders(['x-goog-api-key' => $key])
                ->timeout((int) config('services.gemini.timeout', 20))
                ->acceptJson()
                ->post(sprintf(self::ENDPOINT, config('services.gemini.model')), $payload);
        } catch (ConnectionException $e) {
            Log::warning('Gemini: нет соединения', ['error' => $e->getMessage()]);
            throw new AiServiceException();
        }

        if ($response->failed()) {
            // сам ключ в журнал не пишется
            Log::warning('Gemini: ошибка ответа', ['status' => $response->status()]);
            throw new AiServiceException();
        }

        $text = trim((string) $response->json('candidates.0.content.parts.0.text', ''));
        if ($text === '') {
            throw new AiServiceException('ИИ-ассистент не смог ответить на этот вопрос, попробуйте переформулировать');
        }

        Log::info('Gemini: ответ ассистента', ['user_id' => $user->id, 'messages' => count($messages)]);

        return $text;
    }

    /** Системная инструкция: роль бота, правила и контекст клуба из БД. */
    private function systemPrompt(User $user): string
    {
        $tournaments = Tournament::query()
            ->with('timeControl')
            ->withCount('participants')
            ->whereIn('status', [TournamentStatus::Registration, TournamentStatus::Ongoing])
            ->orderBy('start_date')
            ->limit(10)
            ->get()
            ->map(fn (Tournament $t) => sprintf(
                '- «%s»: %s, %s — %s, %s, контроль %s, участников %d из %d%s',
                $t->title,
                $t->status->label(),
                $t->start_date?->format('d.m.Y'),
                $t->end_date?->format('d.m.Y'),
                $t->location,
                $t->timeControl?->name ?? '—',
                $t->participants_count,
                $t->max_participants,
                $t->min_rating ? ", допуск с рейтингом от {$t->min_rating}" : '',
            ))
            ->implode("\n");

        return <<<PROMPT
        Ты — «Гамбит-бот», дружелюбный ИИ-ассистент шахматного клуба «Гамбит».
        Отвечай по-русски, кратко и по делу (до 6–8 предложений), без разметки Markdown-заголовков.
        Помогаешь с шахматами (дебюты, тактика, эндшпиль, правила, нотация, контроль времени, рейтинг)
        и с работой сайта клуба: как подать заявку на турнир (кнопка «Подать заявку» на странице турнира),
        как устроены швейцарская и круговая системы, что такое коэффициент Бухгольца,
        где тренироваться (раздел «Тренировка» — партия с роботом и разбор ходов).
        Не выдумывай турниры, даты и результаты: о турнирах клуба говори только по списку ниже.
        На вопросы не о шахматах и не о клубе вежливо отвечай, что ты помогаешь только с шахматами.
        Собеседник: {$user->name}, роль на сайте — {$user->role?->label()}, рейтинг {$user->rating}.

        Актуальные турниры клуба (регистрация или идут):
        {$this->orNone($tournaments)}
        PROMPT;
    }

    private function orNone(string $list): string
    {
        return $list !== '' ? $list : '- сейчас нет турниров с открытой регистрацией';
    }
}

<?php

namespace App\Services;

use App\Enums\TournamentStatus;
use App\Exceptions\AiServiceException;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Чат с ИИ-ассистентом клуба «Гамбит-бот» через Google Gemini (generateContent)
 * или Groq (OpenAI-совместимый chat/completions) — провайдер задаётся AI_PROVIDER в .env.
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
        if (config('services.ai.provider') === 'groq') {
            return $this->replyGroq($user, $messages);
        }

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

        $model = Cache::get('gemini.model', config('services.gemini.model'));
        $response = $this->send($key, $model, $payload);

        // модель из настроек снята с поддержки (404) — берём доступную flash-модель из списка Google
        if ($response->status() === 404 && ($fallback = $this->discoverModel($key)) && $fallback !== $model) {
            Log::info('Gemini: модель заменена', ['from' => $model, 'to' => $fallback]);
            Cache::put('gemini.model', $fallback, now()->addDay());
            $response = $this->send($key, $fallback, $payload);
        }

        if ($response->failed()) {
            // сам ключ в журнал не пишется
            Log::warning('Gemini: ошибка ответа', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            throw new AiServiceException();
        }

        $text = trim((string) $response->json('candidates.0.content.parts.0.text', ''));
        if ($text === '') {
            throw new AiServiceException('ИИ-ассистент не смог ответить на этот вопрос, попробуйте переформулировать');
        }

        Log::info('Gemini: ответ ассистента', ['user_id' => $user->id, 'messages' => count($messages)]);

        return $text;
    }

    private const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

    /**
     * Ответ через Groq: формат OpenAI — системное сообщение + история диалога.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    private function replyGroq(User $user, array $messages): string
    {
        $key = config('services.groq.key');
        if (! $key) {
            throw new AiServiceException('ИИ-ассистент не настроен: укажите GROQ_API_KEY в .env');
        }

        $payload = [
            'model' => config('services.groq.model'),
            'messages' => array_merge(
                [['role' => 'system', 'content' => $this->systemPrompt($user)]],
                array_map(fn (array $m) => [
                    'role' => $m['role'] === 'assistant' ? 'assistant' : 'user',
                    'content' => $m['content'],
                ], $messages),
            ),
            'temperature' => 0.7,
            'max_tokens' => 800,
        ];

        try {
            $response = Http::withToken($key)
                ->timeout((int) config('services.groq.timeout', 30))
                ->acceptJson()
                ->retry(2, 1000, fn ($e) => $e instanceof \Illuminate\Http\Client\RequestException
                    && in_array($e->response->status(), [429, 503], true), throw: false)
                ->post(self::GROQ_ENDPOINT, $payload);
        } catch (ConnectionException $e) {
            Log::warning('Groq: нет соединения', ['error' => $e->getMessage()]);
            throw new AiServiceException();
        }

        if ($response->failed()) {
            Log::warning('Groq: ошибка ответа', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            throw new AiServiceException();
        }

        $text = trim((string) $response->json('choices.0.message.content', ''));
        if ($text === '') {
            throw new AiServiceException('ИИ-ассистент не смог ответить на этот вопрос, попробуйте переформулировать');
        }

        Log::info('Groq: ответ ассистента', ['user_id' => $user->id, 'messages' => count($messages)]);

        return $text;
    }

    private function send(string $key, string $model, array $payload): \Illuminate\Http\Client\Response
    {
        try {
            return Http::withHeaders(['x-goog-api-key' => $key])
                ->timeout((int) config('services.gemini.timeout', 20))
                ->acceptJson()
                // Gemini иногда отвечает 503 (перегрузка) — повторяем до 3 раз с паузой
                ->retry(3, 1500, fn ($e) => $e instanceof \Illuminate\Http\Client\RequestException
                    && $e->response->status() === 503, throw: false)
                ->post(sprintf(self::ENDPOINT, $model), $payload);
        } catch (ConnectionException $e) {
            Log::warning('Gemini: нет соединения', ['error' => $e->getMessage()]);
            throw new AiServiceException();
        }
    }

    /** Первая доступная модель семейства flash, поддерживающая generateContent. */
    private function discoverModel(string $key): ?string
    {
        try {
            $models = Http::withHeaders(['x-goog-api-key' => $key])->timeout(10)
                ->get('https://generativelanguage.googleapis.com/v1beta/models', ['pageSize' => 200])
                ->json('models', []);
        } catch (ConnectionException) {
            return null;
        }
        $names = collect($models)
            ->filter(fn ($m) => in_array('generateContent', $m['supportedGenerationMethods'] ?? [], true))
            ->pluck('name')
            ->map(fn ($n) => str_replace('models/', '', $n))
            ->filter(fn ($n) => str_contains($n, 'flash') && ! preg_match('/(tts|image|audio|live|embedding|preview|exp)/', $n));

        return $names->sortDesc()->first() ?? null;
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

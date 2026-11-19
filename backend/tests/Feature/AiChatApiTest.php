<?php

namespace Tests\Feature;

use App\Enums\TournamentStatus;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * ИИ-ассистент: внешний Gemini подменяется Http::fake(), ключ и сеть для тестов не нужны.
 */
class AiChatApiTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/ai/chat';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.ai.provider' => 'gemini', 'services.gemini.key' => 'test-key', 'services.gemini.model' => 'gemini-test']);
    }

    private function fakeReply(string $text = 'Начните с дебюта 1. e4.'): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['role' => 'model', 'parts' => [['text' => $text]]]]],
        ])]);
    }

    public function test_guest_cannot_chat(): void
    {
        $this->postJson(self::URL, ['messages' => [['role' => 'user', 'content' => 'Привет']]])
            ->assertUnauthorized();
    }

    public function test_player_gets_reply_and_club_context_is_sent(): void
    {
        $this->fakeReply();
        Tournament::factory()->create(['title' => 'Кубок ИИ-теста', 'status' => TournamentStatus::Registration]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(self::URL, ['messages' => [
            ['role' => 'user', 'content' => 'Какой дебют выбрать?'],
            ['role' => 'assistant', 'content' => 'Белыми или чёрными?'],
            ['role' => 'user', 'content' => 'Белыми'],
        ]])
            ->assertOk()
            ->assertJsonPath('data.role', 'assistant')
            ->assertJsonPath('data.content', 'Начните с дебюта 1. e4.');

        Http::assertSent(function (Request $request) {
            $body = $request->data();

            return str_contains($request->url(), 'models/gemini-test:generateContent')
                && $request->hasHeader('x-goog-api-key', 'test-key')
                && str_contains($body['system_instruction']['parts'][0]['text'], 'Кубок ИИ-теста')
                && $body['contents'][1]['role'] === 'model'
                && count($body['contents']) === 3;
        });
    }

    public function test_validation_errors(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(self::URL, [])->assertUnprocessable()->assertJsonValidationErrors('messages');
        $this->postJson(self::URL, ['messages' => [['role' => 'admin', 'content' => '']]])
            ->assertUnprocessable()->assertJsonValidationErrors(['messages.0.role', 'messages.0.content']);
        $this->postJson(self::URL, ['messages' => [['role' => 'assistant', 'content' => 'Я бот']]])
            ->assertUnprocessable()->assertJsonValidationErrors('messages');
    }

    public function test_returns_503_when_gemini_fails(): void
    {
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'quota']], 500)]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(self::URL, ['messages' => [['role' => 'user', 'content' => 'Привет']]])
            ->assertStatus(503)
            ->assertJsonPath('message', 'ИИ-ассистент временно недоступен, попробуйте позже');
    }

    public function test_switches_to_available_model_when_configured_one_is_gone(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent' => Http::response(['error' => ['message' => 'not found']], 404),
            'generativelanguage.googleapis.com/v1beta/models?*' => Http::response(['models' => [
                ['name' => 'models/gemini-9-flash', 'supportedGenerationMethods' => ['generateContent']],
                ['name' => 'models/text-embedding-9', 'supportedGenerationMethods' => ['embedContent']],
            ]]),
            'generativelanguage.googleapis.com/v1beta/models/gemini-9-flash:generateContent' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => 'Ответ новой модели']]]]],
            ]),
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(self::URL, ['messages' => [['role' => 'user', 'content' => 'Привет']]])
            ->assertOk()->assertJsonPath('data.content', 'Ответ новой модели');
    }

    public function test_returns_503_without_api_key(): void
    {
        config(['services.gemini.key' => null]);
        Http::fake();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(self::URL, ['messages' => [['role' => 'user', 'content' => 'Привет']]])
            ->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_groq_provider_returns_reply(): void
    {
        config(['services.ai.provider' => 'groq', 'services.groq.key' => 'test-key', 'services.groq.model' => 'groq-test']);
        Http::fake(['api.groq.com/*' => Http::response([
            'choices' => [['message' => ['role' => 'assistant', 'content' => 'Играйте 1. d4.']]],
        ])]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(self::URL, ['messages' => [['role' => 'user', 'content' => 'Какой дебют выбрать?']]])
            ->assertOk()
            ->assertJsonPath('data.content', 'Играйте 1. d4.');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'api.groq.com/openai/v1/chat/completions')
            && $request['model'] === 'groq-test'
            && $request['messages'][0]['role'] === 'system');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\ChatRequest;
use App\Services\AiChatService;
use Illuminate\Http\JsonResponse;

class AiChatController extends Controller
{
    public function __construct(private readonly AiChatService $chat) {}

    /** POST /api/v1/ai/chat — ответ ИИ-ассистента клуба (Gemini) */
    public function chat(ChatRequest $request): JsonResponse
    {
        $reply = $this->chat->reply($request->user(), $request->validated('messages'));

        return response()->json(['data' => ['role' => 'assistant', 'content' => $reply]]);
    }
}

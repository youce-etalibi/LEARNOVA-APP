<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenRouterService
{
    protected string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = env('OPENROUTER_API_KEY') ?? '';
        $this->model = env('OPENROUTER_MODEL') ?? 'openrouter/free';
    }

    /**
     * Send a list of messages to OpenRouter chat completion API.
     */
    public function chat(array $messages): ?string
    {
        if (empty($this->apiKey)) {
            Log::warning('OpenRouter API key is missing.');
            return "Désolé, l'IA Learnova est désactivée car la clé API OpenRouter est manquante.";
        }

        try {
            $response = Http::withoutVerifying()
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'HTTP-Referer' => 'http://localhost:8000',
                'Content-Type' => 'application/json',
            ])
            ->timeout(30)
            ->post('https://openrouter.ai/api/v1/chat/completions', [
                'model' => $this->model,
                'messages' => $messages,
            ]);

            if ($response->failed()) {
                Log::error('OpenRouter request failed: ' . $response->body());
                return "Désolé, une erreur s'est produite lors de la connexion à l'IA.";
            }

            $data = $response->json();
            return $data['choices'][0]['message']['content'] ?? null;

        } catch (\Exception $e) {
            Log::error('OpenRouter exception: ' . $e->getMessage());
            return "Une exception est survenue lors de la communication avec l'assistant virtuel.";
        }
    }

    /**
     * Call OpenRouter with instructions to return strict JSON data.
     */
    public function getJsonStructure(array $messages): ?array
    {
        $responseContent = $this->chat($messages);

        if (!$responseContent) return null;

        // Clean output to isolate JSON content if LLM returns markdown wrapping (e.g. ```json ... ```)
        $cleanJson = $responseContent;
        if (preg_match('/```json\s*(.*?)\s*```/s', $responseContent, $matches)) {
            $cleanJson = $matches[1];
        } elseif (preg_match('/```\s*(.*?)\s*```/s', $responseContent, $matches)) {
            $cleanJson = $matches[1];
        }

        $cleanJson = trim($cleanJson);
        $decoded = json_decode($cleanJson, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Failed to decode OpenRouter JSON: ' . json_last_error_msg() . ' | Raw: ' . $responseContent);
            return null;
        }

        return $decoded;
    }
}

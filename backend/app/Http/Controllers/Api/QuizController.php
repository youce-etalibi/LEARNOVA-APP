<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizQuestion;
use App\Models\QuizOption;
use App\Models\QuizAttempt;
use App\Models\QuizAnswer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\OpenRouterService;

class QuizController extends Controller
{
    /**
     * GET /api/quizzes/{quiz} — Load quiz with questions & options.
     */
    public function show(Quiz $quiz): JsonResponse
    {
        return response()->json($quiz->load('questions.options'));
    }

    /**
     * POST /api/quizzes/{quiz}/questions — Add question to a quiz.
     */
    public function addQuestion(Request $request, Quiz $quiz): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'type' => ['required', 'in:mcq,true_false,short'],
            'points' => ['required', 'numeric', 'min:0'],
            'explanation' => ['nullable', 'string'],
            'options' => ['required', 'array', 'min:2'],
            'options.*.label' => ['required', 'string'],
            'options.*.is_correct' => ['required', 'boolean'],
        ]);

        $question = DB::transaction(function () use ($quiz, $data) {
            $q = QuizQuestion::create([
                'quiz_id' => $quiz->id,
                'question' => $data['question'],
                'type' => $data['type'],
                'points' => $data['points'],
                'explanation' => $data['explanation'] ?? null,
            ]);

            foreach ($data['options'] as $opt) {
                QuizOption::create([
                    'question_id' => $q->id,
                    'label' => $opt['label'],
                    'is_correct' => $opt['is_correct'],
                ]);
            }

            return $q;
        });

        return response()->json($question->load('options'), 201);
    }

    /**
     * POST /api/quizzes/{quiz}/attempts — Start attempt.
     */
    public function startAttempt(Quiz $quiz): JsonResponse
    {
        $user = auth('api')->user();

        // Check if student has remaining attempts
        $attemptsCount = QuizAttempt::where('quiz_id', $quiz->id)
            ->where('user_id', $user->id)
            ->count();

        if ($attemptsCount >= $quiz->attempts_allowed) {
            return response()->json(['error' => 'Nombre maximal de tentatives atteint.'], 422);
        }

        $attempt = QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'started_at' => now(),
        ]);

        return response()->json($attempt, 201);
    }

    /**
     * POST /api/quiz-attempts/{attempt}/submit — Submit answers & grade.
     */
    public function submitAttempt(Request $request, QuizAttempt $attempt): JsonResponse
    {
        $request->validate([
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'exists:quiz_questions,id'],
            'answers.*.option_id' => ['nullable', 'exists:quiz_options,id'],
            'answers.*.answer_text' => ['nullable', 'string'],
        ]);

        if ($attempt->finished_at !== null) {
            return response()->json(['error' => 'Cette tentative est déjà soumise.'], 422);
        }

        $score = DB::transaction(function () use ($attempt, $request) {
            $totalPoints = 0;
            $earnedPoints = 0;

            foreach ($request->answers as $ans) {
                $question = QuizQuestion::findOrFail($ans['question_id']);
                $totalPoints += $question->points;

                $isCorrect = false;

                if ($question->type === 'mcq' || $question->type === 'true_false') {
                    $option = QuizOption::findOrFail($ans['option_id']);
                    $isCorrect = (bool)$option->is_correct;
                } else {
                    $correctOption = QuizOption::where('question_id', $question->id)
                        ->where('is_correct', true)
                        ->first();
                    if ($correctOption && strtolower(trim($ans['answer_text'] ?? '')) === strtolower(trim($correctOption->label))) {
                        $isCorrect = true;
                    }
                }

                if ($isCorrect) {
                    $earnedPoints += $question->points;
                }

                QuizAnswer::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'option_id' => $ans['option_id'] ?? null,
                    'answer_text' => $ans['answer_text'] ?? null,
                    'is_correct' => $isCorrect,
                ]);
            }

            // Normalise score out of 20
            $finalScore = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 20, 2) : 0.00;

            $attempt->update([
                'score' => $finalScore,
                'finished_at' => now(),
            ]);

            return $finalScore;
        });

        return response()->json([
            'message' => 'Quiz soumis avec succès.',
            'score' => $score,
            'attempt' => $attempt,
        ]);
    }

    /**
     * GET /api/question-banks — List questions in the professor's bank.
     */
    public function indexQuestionBank(Request $request): JsonResponse
    {
        $professor = auth('api')->user()->professor;

        if (!$professor) {
            return response()->json(['error' => 'Profil professeur introuvable.'], 403);
        }

        $query = \App\Models\QuestionBank::where('professor_id', $professor->id);

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * POST /api/question-banks — Save a question to the bank.
     */
    public function storeQuestionBank(Request $request): JsonResponse
    {
        $professor = auth('api')->user()->professor;

        if (!$professor) {
            return response()->json(['error' => 'Profil professeur introuvable.'], 403);
        }

        $data = $request->validate([
            'category' => ['required', 'string', 'max:100'],
            'question_text' => ['required', 'string'],
            'type' => ['required', 'in:mcq,true_false,short'],
            'points' => ['required', 'numeric', 'min:0'],
            'explanation' => ['nullable', 'string'],
            'options_json' => ['required', 'array', 'min:2'],
            'options_json.*.label' => ['required', 'string'],
            'options_json.*.is_correct' => ['required', 'boolean'],
        ]);

        $data['professor_id'] = $professor->id;

        $question = \App\Models\QuestionBank::create($data);

        return response()->json($question, 201);
    }

    /**
     * POST /api/quizzes/{quiz}/import-question — Import a question from bank.
     */
    public function importQuestion(Request $request, Quiz $quiz): JsonResponse
    {
        $data = $request->validate([
            'question_bank_id' => ['required', 'exists:question_banks,id'],
        ]);

        $bankItem = \App\Models\QuestionBank::findOrFail($data['question_bank_id']);

        $question = DB::transaction(function () use ($quiz, $bankItem) {
            $q = QuizQuestion::create([
                'quiz_id' => $quiz->id,
                'question' => $bankItem->question_text,
                'type' => $bankItem->type,
                'points' => $bankItem->points,
                'explanation' => $bankItem->explanation,
            ]);

            foreach ($bankItem->options_json as $opt) {
                QuizOption::create([
                    'question_id' => $q->id,
                    'label' => $opt['label'],
                    'is_correct' => $opt['is_correct'],
                ]);
            }

            return $q;
        });

        return response()->json($question->load('options'), 201);
    }

    /**
     * POST /api/quiz-attempts/{attempt}/infraction — Track tab blur events.
     */
    public function logInfraction(QuizAttempt $attempt): JsonResponse
    {
        if ($attempt->finished_at !== null) {
            return response()->json(['error' => 'Cette tentative est déjà fermée.'], 422);
        }

        $newCount = $attempt->infractions_count + 1;
        $attempt->update(['infractions_count' => $newCount]);

        $autoSubmitted = false;

        if ($newCount >= 3) {
            // Auto submit attempt with 0 grade
            $attempt->update([
                'score' => 0.00,
                'finished_at' => now(),
            ]);
            $autoSubmitted = true;
        }

        return response()->json([
            'message' => 'Infraction enregistrée.',
            'infractions_count' => $newCount,
            'auto_submitted' => $autoSubmitted,
            'attempt' => $attempt,
        ]);
    }

    /**
     * GET /api/quiz-attempts/{attempt}/review — Secure review of completed quiz attempt.
     */
    public function review(QuizAttempt $attempt): JsonResponse
    {
        $user = auth('api')->user();

        if ($attempt->user_id !== $user->id && !$user->professor) {
            return response()->json(['error' => 'Non autorisé.'], 403);
        }

        if ($attempt->finished_at === null) {
            return response()->json(['error' => 'Cette tentative n\'est pas encore terminée.'], 400);
        }

        $attempt->load([
            'quiz.questions.options',
            'answers'
        ]);

        return response()->json($attempt);
    }

    /**
     * GET /api/quizzes/{quiz}/attempts — Professor lists all attempts for a quiz.
     */
    public function indexAttempts(Quiz $quiz): JsonResponse
    {
        $user = auth('api')->user();

        if (!$user->professor) {
            return response()->json(['error' => 'Non autorisé.'], 403);
        }

        $attempts = QuizAttempt::with('user:id,name,email')
            ->where('quiz_id', $quiz->id)
            ->latest()
            ->get();

        return response()->json($attempts);
    }

    /**
     * POST /api/quizzes/{quiz}/generate-questions
     */
    public function generateQuestions(Request $request, Quiz $quiz): JsonResponse
    {
        $request->validate([
            'topic' => ['required', 'string', 'min:3'],
            'count' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $topic = $request->input('topic');
        $count = $request->input('count', 3);

        $context = "Tu es un assistant pédagogique universitaire. Ta tâche est de concevoir un quiz de niveau universitaire sur le sujet fourni.\n";
        $context .= "Tu dois retourner UNIQUEMENT un tableau JSON valide contenant exactement " . $count . " questions au format suivant :\n";
        $context .= "[\n";
        $context .= "  {\n";
        $context .= "    \"question\": \"Le texte de la question...\",\n";
        $context .= "    \"type\": \"mcq\",\n";
        $context .= "    \"points\": 5,\n";
        $context .= "    \"explanation\": \"Explication pédagogique détaillée...\",\n";
        $context .= "    \"options\": [\n";
        $context .= "      {\"label\": \"Option correcte\", \"is_correct\": true},\n";
        $context .= "      {\"label\": \"Option incorrecte 1\", \"is_correct\": false},\n";
        $context .= "      {\"label\": \"Option incorrecte 2\", \"is_correct\": false}\n";
        $context .= "    ]\n";
        $context .= "  }\n";
        $context .= "]\n";
        $context .= "Règles strictes :\n";
        $context .= "1. Ne renvoie AUCUN texte en dehors du tableau JSON.\n";
        $context .= "2. Les questions doivent être en français.\n";
        $context .= "3. Assure-toi que chaque question a exactement une seule option correcte.";

        $messages = [
            ['role' => 'system', 'content' => $context],
            ['role' => 'user', 'content' => "Génère les questions pour le sujet : " . $topic]
        ];

        $openRouterService = new OpenRouterService();
        $questionsData = $openRouterService->getJsonStructure($messages);

        if (!$questionsData || !is_array($questionsData)) {
            return response()->json(['error' => "L'IA a échoué à générer un format de questions valide. Veuillez réessayer."], 500);
        }

        $createdQuestions = [];

        DB::transaction(function () use ($quiz, $questionsData, &$createdQuestions) {
            foreach ($questionsData as $item) {
                if (!isset($item['question']) || !isset($item['options']) || !is_array($item['options'])) {
                    continue;
                }

                $q = QuizQuestion::create([
                    'quiz_id' => $quiz->id,
                    'question' => $item['question'],
                    'type' => $item['type'] ?? 'mcq',
                    'points' => $item['points'] ?? 5,
                    'explanation' => $item['explanation'] ?? null,
                ]);

                foreach ($item['options'] as $opt) {
                    QuizOption::create([
                        'question_id' => $q->id,
                        'label' => $opt['label'] ?? 'Option',
                        'is_correct' => (bool)($opt['is_correct'] ?? false),
                    ]);
                }

                $createdQuestions[] = $q->load('options');
            }
        });

        return response()->json([
            'message' => count($createdQuestions) . ' questions générées avec succès !',
            'questions' => $createdQuestions,
        ], 201);
    }
}

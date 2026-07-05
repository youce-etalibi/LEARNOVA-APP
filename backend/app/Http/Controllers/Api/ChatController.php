<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatParticipant;
use App\Models\Message;
use App\Models\Professor;
use App\Models\Promotion;
use App\Models\Student;
use App\Models\User;
use App\Models\Module;
use App\Services\OpenRouterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    /**
     * List all conversations for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = ChatConversation::whereHas('users', function ($query) use ($user) {
            $query->where('users.id', $user->id);
        })
        ->with(['users' => function ($query) use ($user) {
            // Include other participants details
            $query->where('users.id', '!=', $user->id);
        }, 'promotion', 'participants' => function ($query) use ($user) {
            $query->where('user_id', $user->id);
        }])
        ->get();

        $formatted = $conversations->map(function ($conv) use ($user) {
            $lastMessage = Message::where('conversation_id', $conv->id)
                ->with('sender')
                ->latest('created_at')
                ->first();

            $myParticipantRecord = $conv->participants->first();
            $lastReadAt = $myParticipantRecord ? $myParticipantRecord->last_read_at : null;

            $unreadCount = Message::where('conversation_id', $conv->id)
                ->where('sender_id', '!=', $user->id)
                ->when($lastReadAt, function ($q) use ($lastReadAt) {
                    $q->where('created_at', '>', $lastReadAt);
                })
                ->count();

            // Resolve name and avatar for direct chats
            $chatName = $conv->name;
            $avatar = null;
            $otherUser = null;

            if ($conv->type === 'direct') {
                $otherUser = $conv->users->first();
                $chatName = $otherUser ? $otherUser->name : 'Utilisateur archivé';
                $avatar = $otherUser ? ($otherUser->name[0] ?? '?') : '?';
            } else {
                $chatName = $conv->name ?? ($conv->promotion ? $conv->promotion->name : 'Groupe sans nom');
                $avatar = 'G';
            }

            return [
                'id' => $conv->id,
                'name' => $chatName,
                'type' => $conv->type,
                'avatar' => $avatar,
                'other_user' => $otherUser ? [
                    'id' => $otherUser->id,
                    'name' => $otherUser->name,
                    'email' => $otherUser->email,
                    'status' => $otherUser->status,
                ] : null,
                'promotion' => $conv->promotion ? [
                    'id' => $conv->promotion->id,
                    'name' => $conv->promotion->name,
                ] : null,
                'read_only_for_students' => $conv->read_only_for_students,
                'last_message' => $lastMessage ? [
                    'content' => $lastMessage->content,
                    'sender_name' => $lastMessage->sender->name,
                    'sender_id' => $lastMessage->sender_id,
                    'created_at' => $lastMessage->created_at->toIso8601String(),
                ] : null,
                'unread_count' => $unreadCount,
                'updated_at' => $lastMessage ? $lastMessage->created_at->toIso8601String() : $conv->updated_at->toIso8601String(),
            ];
        })
        ->sortByDesc('updated_at')
        ->values();

        return response()->json($formatted);
    }

    /**
     * Get details and messages of a specific conversation.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $conversation = ChatConversation::whereHas('users', function ($query) use ($user) {
            $query->where('users.id', $user->id);
        })
        ->with(['users', 'promotion'])
        ->find($id);

        if (!$conversation) {
            return response()->json(['error' => 'Conversation introuvable ou accès refusé.'], 403);
        }

        // Update read receipt
        ChatParticipant::where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        $messages = Message::where('conversation_id', $conversation->id)
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'sender_id' => $msg->sender_id,
                    'sender_name' => $msg->sender->name,
                    'content' => $msg->content,
                    'created_at' => $msg->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'conversation' => [
                'id' => $conversation->id,
                'name' => $conversation->name ?? ($conversation->promotion ? $conversation->promotion->name : null),
                'type' => $conversation->type,
                'read_only_for_students' => $conversation->read_only_for_students,
                'promotion_id' => $conversation->promotion_id,
            ],
            'messages' => $messages,
        ]);
    }

    /**
     * Send a message to an existing conversation.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'conversation_id' => 'required|exists:chat_conversations,id',
            'content' => 'required|string|min:1',
        ]);

        $user = $request->user();
        $conversationId = $request->input('conversation_id');
        $content = $request->input('content');

        // Verify participation
        $participant = ChatParticipant::where('conversation_id', $conversationId)
            ->where('user_id', $user->id)
            ->first();

        if (!$participant) {
            return response()->json(['error' => 'Vous ne faites pas partie de cette conversation.'], 403);
        }

        $conversation = ChatConversation::find($conversationId);

        // Intercept AI chatbot conversation
        $aiUser = $conversation->users()->where('email', 'ai@learnova.test')->first();
        if ($aiUser) {
            // Save the user's message
            $userMessage = Message::create([
                'conversation_id' => $conversationId,
                'sender_id' => $user->id,
                'content' => $content,
            ]);

            // Mark user's read receipt
            $participant->update(['last_read_at' => now()]);

            // Gather academic context
            $context = "Tu es Learnova IA, un tuteur académique virtuel intelligent intégré dans la plateforme Learnova.\n";
            $context .= "Tu discutes avec " . $user->name . " (Rôle: " . ($user->hasRole('Student') ? 'Étudiant' : ($user->hasRole('Professor') ? 'Enseignant' : 'Administration')) . ").\n";

            if ($user->hasRole('Student')) {
                $student = Student::where('user_id', $user->id)->with('promotion.filiere')->first();
                if ($student) {
                    $context .= "L'étudiant est dans la classe : " . ($student->promotion->name ?? 'Non définie') . " (Filière: " . ($student->promotion->filiere->name ?? 'Non définie') . ").\n";
                    if ($student->promotion) {
                        $modules = Module::where('filiere_id', $student->promotion->filiere_id)->pluck('name')->toArray();
                        $context .= "Ses matières d'études ce semestre sont : " . implode(', ', $modules) . ".\n";
                    }
                }
            } elseif ($user->hasRole('Professor')) {
                $prof = Professor::where('user_id', $user->id)->with('modules')->first();
                if ($prof) {
                    $modules = $prof->modules->pluck('name')->toArray();
                    $context .= "C'est un enseignant qui enseigne les matières suivantes : " . implode(', ', $modules) . ".\n";
                }
            }

            $context .= "\nRéponds en français. Sois concis, utilise des emojis pour rendre les réponses chaleureuses, et structure tes explications en Markdown.";

            // Load last 10 messages from database as conversation history
            $history = Message::where('conversation_id', $conversationId)
                ->orderBy('created_at', 'asc')
                ->take(10)
                ->get();

            $openRouterMessages = [
                ['role' => 'system', 'content' => $context]
            ];

            foreach ($history as $historyMsg) {
                if ($historyMsg->id != $userMessage->id) {
                    $role = $historyMsg->sender_id === $aiUser->id ? 'assistant' : 'user';
                    $openRouterMessages[] = [
                        'role' => $role,
                        'content' => $historyMsg->content
                    ];
                }
            }

            // Add current message
            $openRouterMessages[] = [
                'role' => 'user',
                'content' => $content
            ];

            // Call OpenRouter API
            $openRouterService = new OpenRouterService();
            $reply = $openRouterService->chat($openRouterMessages);

            if (!$reply) {
                $reply = "Désolé, je rencontre une difficulté technique pour répondre. Veuillez réessayer dans quelques instants.";
            }

            // Save the AI message reply
            $aiMessage = Message::create([
                'conversation_id' => $conversationId,
                'sender_id' => $aiUser->id,
                'content' => $reply,
            ]);

            // Update AI read receipt
            ChatParticipant::where('conversation_id', $conversationId)
                ->where('user_id', $aiUser->id)
                ->update(['last_read_at' => now()]);

            return response()->json([
                'id' => $aiMessage->id,
                'sender_id' => $aiMessage->sender_id,
                'sender_name' => $aiUser->name,
                'content' => $aiMessage->content,
                'created_at' => $aiMessage->created_at->toIso8601String(),
            ]);
        }

        // Check if group is read-only for students
        if ($conversation->type === 'group' && $conversation->read_only_for_students) {
            if ($user->hasRole('Student')) {
                return response()->json(['error' => 'Seuls les enseignants peuvent envoyer des messages dans ce groupe.'], 403);
            }
        }

        $message = Message::create([
            'conversation_id' => $conversationId,
            'sender_id' => $user->id,
            'content' => $content,
        ]);

        // Update read receipt for sender
        $participant->update(['last_read_at' => now()]);

        return response()->json([
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'sender_name' => $user->name,
            'content' => $message->content,
            'created_at' => $message->created_at->toIso8601String(),
        ]);
    }

    /**
     * Start a new direct conversation or return the existing one.
     */
    public function startDirect(Request $request): JsonResponse
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'content' => 'required|string|min:1',
        ]);

        $user = $request->user();
        $receiverId = $request->input('receiver_id');
        $content = $request->input('content');

        if ($user->id == $receiverId) {
            return response()->json(['error' => 'Vous ne pouvez pas chatter avec vous-même.'], 422);
        }

        // Enforce role-based contact routing logic
        if (!$this->canMessageUser($user, $receiverId)) {
            return response()->json(['error' => 'Vous n\'êtes pas autorisé à démarrer un chat avec cet utilisateur.'], 403);
        }

        // Check if a direct chat already exists
        $existing = ChatConversation::where('type', 'direct')
            ->whereHas('users', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            })
            ->whereHas('users', function ($q) use ($receiverId) {
                $q->where('users.id', $receiverId);
            })
            ->first();

        if ($existing) {
            $message = Message::create([
                'conversation_id' => $existing->id,
                'sender_id' => $user->id,
                'content' => $content,
            ]);

            // Update read receipts
            ChatParticipant::where('conversation_id', $existing->id)
                ->where('user_id', $user->id)
                ->update(['last_read_at' => now()]);

            return response()->json(['conversation_id' => $existing->id]);
        }

        // Create new direct conversation
        DB::transaction(function () use ($user, $receiverId, $content, &$newConversation) {
            $newConversation = ChatConversation::create([
                'type' => 'direct',
                'creator_id' => $user->id,
            ]);

            ChatParticipant::create([
                'conversation_id' => $newConversation->id,
                'user_id' => $user->id,
                'last_read_at' => now(),
            ]);

            ChatParticipant::create([
                'conversation_id' => $newConversation->id,
                'user_id' => $receiverId,
                'last_read_at' => null,
            ]);

            Message::create([
                'conversation_id' => $newConversation->id,
                'sender_id' => $user->id,
                'content' => $content,
            ]);
        });

        return response()->json(['conversation_id' => $newConversation->id]);
    }

    /**
     * Create a group conversation for a promotion.
     */
    public function createGroup(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('Student')) {
            return response()->json(['error' => 'Seuls les enseignants ou l\'administration peuvent créer des groupes.'], 403);
        }

        $request->validate([
            'promotion_id' => 'required|exists:promotions,id',
            'name' => 'required|string|max:100',
            'read_only_for_students' => 'boolean',
        ]);

        $promotionId = $request->input('promotion_id');
        $name = $request->input('name');
        $readOnly = $request->input('read_only_for_students', false);

        // If user is a professor, check if they teach this promotion
        if ($user->hasRole('Professor')) {
            $prof = Professor::where('user_id', $user->id)->first();
            if (!$prof) {
                return response()->json(['error' => 'Profil enseignant introuvable.'], 403);
            }

            $promotion = Promotion::find($promotionId);
            $teaches = $prof->modules()
                ->where('filiere_id', $promotion->filiere_id)
                ->exists();

            if (!$teaches) {
                return response()->json(['error' => 'Vous n\'enseignez pas à cette promotion.'], 403);
            }
        }

        // Create group and enroll all students in the promotion
        DB::transaction(function () use ($user, $promotionId, $name, $readOnly, &$conv) {
            $conv = ChatConversation::create([
                'type' => 'group',
                'name' => $name,
                'creator_id' => $user->id,
                'promotion_id' => $promotionId,
                'read_only_for_students' => $readOnly,
            ]);

            // Add creator
            ChatParticipant::create([
                'conversation_id' => $conv->id,
                'user_id' => $user->id,
                'last_read_at' => now(),
            ]);

            // Add all students of the promotion
            $studentUserIds = Student::where('promotion_id', $promotionId)
                ->pluck('user_id');

            foreach ($studentUserIds as $studentUserId) {
                if ($studentUserId != $user->id) {
                    ChatParticipant::create([
                        'conversation_id' => $conv->id,
                        'user_id' => $studentUserId,
                        'last_read_at' => null,
                    ]);
                }
            }

            // Create initial system message
            Message::create([
                'conversation_id' => $conv->id,
                'sender_id' => $user->id,
                'content' => "📢 Groupe créé par " . $user->name . ". " . ($readOnly ? "Seuls les enseignants peuvent écrire." : "Tout le monde peut chatter !"),
            ]);
        });

        return response()->json(['conversation_id' => $conv->id]);
    }

    /**
     * Get eligible contacts based on roles.
     */
    public function getEligibleContacts(Request $request): JsonResponse
    {
        $user = $request->user();
        $eligible = [];

        if ($user->hasRole('Student')) {
            // 1. Get professors who teach modules in their promotion
            $student = Student::where('user_id', $user->id)->first();
            if ($student && $student->promotion) {
                $filiereId = $student->promotion->filiere_id;
                
                $professors = Professor::whereHas('modules', function ($q) use ($filiereId) {
                    $q->where('filiere_id', $filiereId);
                })
                ->with('user')
                ->get()
                ->map(function ($p) {
                    return [
                        'id' => $p->user->id,
                        'name' => $p->user->name,
                        'role' => 'Professor',
                        'detail' => $p->speciality ?? 'Enseignant',
                    ];
                });

                $eligible['professors'] = $professors;
            }

            // 2. Get Admin and Management users
            $eligible['staff'] = User::role(['Admin', 'SuperAdmin', 'ManagementPedagogique'])
                ->get()
                ->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'role' => 'Administration',
                        'detail' => 'Scolarité / Support',
                    ];
                });
        }
        elseif ($user->hasRole('Professor')) {
            $prof = Professor::where('user_id', $user->id)->first();
            if ($prof) {
                // 1. Get students in promotions they teach
                $filiereIds = $prof->modules()->pluck('filiere_id');
                
                $students = Student::whereHas('promotion', function ($q) use ($filiereIds) {
                    $q->whereIn('filiere_id', $filiereIds);
                })
                ->with(['user', 'promotion'])
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => $s->user->id,
                        'name' => $s->user->name,
                        'role' => 'Student',
                        'detail' => $s->promotion->name,
                    ];
                });

                $eligible['students'] = $students;

                // 2. Get Promotions they teach (for creating class groups)
                $eligible['promotions'] = Promotion::whereIn('filiere_id', $filiereIds)
                    ->get()
                    ->map(function ($p) {
                        return [
                            'id' => $p->id,
                            'name' => $p->name,
                        ];
                    });
            }

            // 3. Get Admin and Management users
            $eligible['staff'] = User::role(['Admin', 'SuperAdmin', 'ManagementPedagogique'])
                ->get()
                ->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'role' => 'Administration',
                        'detail' => 'Administration',
                    ];
                });
        }
        else {
            // Admin or Pedagogical Management can chat with anyone
            $eligible['students'] = Student::with(['user', 'promotion'])
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => $s->user->id,
                        'name' => $s->user->name,
                        'role' => 'Student',
                        'detail' => $s->promotion->name,
                    ];
                });

            $eligible['professors'] = Professor::with('user')
                ->get()
                ->map(function ($p) {
                    return [
                        'id' => $p->user->id,
                        'name' => $p->user->name,
                        'role' => 'Professor',
                        'detail' => $p->speciality ?? 'Enseignant',
                    ];
                });

            $eligible['staff'] = User::role(['Admin', 'SuperAdmin', 'ManagementPedagogique'])
                ->where('id', '!=', $user->id)
                ->get()
                ->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'role' => 'Administration',
                        'detail' => 'Administration',
                    ];
                });

            // List all promotions for group creation
            $eligible['promotions'] = Promotion::get()
                ->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                    ];
                });
        }

        return response()->json($eligible);
    }

    /**
     * Check if user is authorized to message another user.
     */
    private function canMessageUser(User $sender, int $receiverId): bool
    {
        $receiver = User::find($receiverId);
        if (!$receiver) return false;

        // Admins and Managers can message anyone
        if ($sender->hasRole(['Admin', 'SuperAdmin', 'ManagementPedagogique'])) {
            return true;
        }

        // If sender is a student
        if ($sender->hasRole('Student')) {
            // Students can message any Admin / Manager
            if ($receiver->hasRole(['Admin', 'SuperAdmin', 'ManagementPedagogique'])) {
                return true;
            }

            // Students can message professors teaching their promotion modules
            if ($receiver->hasRole('Professor')) {
                $student = Student::where('user_id', $sender->id)->first();
                $prof = Professor::where('user_id', $receiver->id)->first();
                if ($student && $prof) {
                    return $prof->modules()
                        ->where('filiere_id', $student->promotion->filiere_id)
                        ->exists();
                }
            }
        }

        // If sender is a professor
        if ($sender->hasRole('Professor')) {
            // Professors can message any Admin / Manager
            if ($receiver->hasRole(['Admin', 'SuperAdmin', 'ManagementPedagogique'])) {
                return true;
            }

            // Professors can message students in their taught promotions
            if ($receiver->hasRole('Student')) {
                $prof = Professor::where('user_id', $sender->id)->first();
                $student = Student::where('user_id', $receiver->id)->first();
                if ($student && $prof) {
                    return $prof->modules()
                        ->where('filiere_id', $student->promotion->filiere_id)
                        ->exists();
                }
            }
        }

        return false;
    }

    /**
     * Fetch the overall count of unread chat messages for Navbar badge.
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $unreadCount = Message::whereHas('conversation.users', function ($query) use ($user) {
            $query->where('users.id', $user->id);
        })
        ->where('sender_id', '!=', $user->id)
        ->where(function ($query) use ($user) {
            $query->whereRaw('created_at > (
                SELECT last_read_at 
                FROM chat_participants 
                WHERE chat_participants.conversation_id = messages.conversation_id 
                AND chat_participants.user_id = ?
            )', [$user->id])
            ->orWhereNull(DB::raw('(
                SELECT last_read_at 
                FROM chat_participants 
                WHERE chat_participants.conversation_id = messages.conversation_id 
                AND chat_participants.user_id = ' . $user->id . '
            )'));
        })
        ->count();

        return response()->json(['unread_count' => $unreadCount]);
    }
}

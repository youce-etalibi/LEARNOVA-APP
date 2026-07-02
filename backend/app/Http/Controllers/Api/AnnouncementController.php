<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    private const AUTHOR_ROLES = ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor'];

    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        $canModerate = $user && $user->hasAnyRole(self::AUTHOR_ROLES);

        $query = Announcement::with('author:id,name');

        // Drafts are only listed for authors/moderators who explicitly ask.
        if (! ($canModerate && $request->boolean('include_drafts'))) {
            $query->whereNotNull('published_at');
        }

        if ($type = $request->query('target_type')) {
            $query->where('target_type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('content', 'ilike', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderByDesc('pinned')->orderByDesc('published_at')->orderByDesc('created_at')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'target_type' => ['required', 'in:all,promotion,department,module'],
            'target_id' => ['nullable', 'integer'],
            'pinned' => ['boolean'],
            'publish' => ['boolean'],
        ]);

        $announcement = Announcement::create([
            'author_id' => auth('api')->id(),
            'title' => $data['title'],
            'content' => $data['content'],
            'target_type' => $data['target_type'],
            'target_id' => $data['target_id'] ?? null,
            'pinned' => $data['pinned'] ?? false,
            'published_at' => ($data['publish'] ?? true) ? now() : null,
        ]);

        return response()->json($announcement->load('author:id,name'), 201);
    }

    public function show(Announcement $announcement): JsonResponse
    {
        if (! $announcement->published_at) {
            $user = auth('api')->user();
            abort_unless($user && $user->hasAnyRole(self::AUTHOR_ROLES), 404);
        }

        return response()->json($announcement->load('author:id,name'));
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'string'],
            'target_type' => ['sometimes', 'in:all,promotion,department,module'],
            'target_id' => ['nullable', 'integer'],
            'pinned' => ['boolean'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        // Publish/unpublish without touching the original publication date.
        if (array_key_exists('publish', $data)) {
            $announcement->published_at = $data['publish']
                ? ($announcement->published_at ?? now())
                : null;
            unset($data['publish']);
        }

        $announcement->fill($data)->save();

        return response()->json($announcement->load('author:id,name'));
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return response()->json(['message' => 'Annonce supprimée.']);
    }
}

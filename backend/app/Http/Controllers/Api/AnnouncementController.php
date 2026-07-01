<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Announcement::with('author:id,name')
            ->whereNotNull('published_at');

        if ($type = $request->query('target_type')) {
            $query->where('target_type', $type);
        }

        return response()->json(
            $query->orderByDesc('pinned')->orderByDesc('published_at')
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
        ]);

        $announcement->update($data);

        return response()->json($announcement);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return response()->json(['message' => 'Annonce supprimée.']);
    }
}

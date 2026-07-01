<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        return response()->json($query->orderBy('name')->paginate($request->integer('per_page', 50)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'integer', 'min:1'],
            'type' => ['required', 'in:classroom,amphi,lab,online'],
            'building' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json(Room::create($data), 201);
    }

    public function show(Room $room): JsonResponse
    {
        return response()->json($room);
    }

    public function update(Request $request, Room $room): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'type' => ['sometimes', 'in:classroom,amphi,lab,online'],
            'building' => ['nullable', 'string', 'max:255'],
        ]);

        $room->update($data);

        return response()->json($room);
    }

    public function destroy(Room $room): JsonResponse
    {
        $room->delete();

        return response()->json(['message' => 'Salle supprimée.']);
    }
}

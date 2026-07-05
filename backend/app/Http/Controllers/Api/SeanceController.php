<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Seance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Seance::with([
            'module:id,name,code',
            'professor.user:id,name',
            'promotion:id,name',
            'room:id,name',
        ]);

        // Scope by role: students see their promotion, professors see their own sessions.
        if ($user->hasRole('Student') && $user->student) {
            $query->where('promotion_id', $user->student->promotion_id);
        } elseif ($user->hasRole('Professor') && $user->professor) {
            $query->where('professor_id', $user->professor->id);
        }

        if ($p = $request->query('promotion_id')) {
            $query->where('promotion_id', $p);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('date', '<=', $to);
        }

        return response()->json(
            $query->orderBy('date')->orderBy('start_time')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);

        return response()->json(Seance::create($data)->load('module:id,name', 'professor.user:id,name', 'room:id,name'), 201);
    }

    public function show(Seance $seance): JsonResponse
    {
        return response()->json($seance->load('module', 'professor.user:id,name', 'promotion', 'room', 'absences'));
    }

    public function update(Request $request, Seance $seance): JsonResponse
    {
        $seance->update($this->validateData($request, false));

        return response()->json($seance);
    }

    public function destroy(Seance $seance): JsonResponse
    {
        $seance->delete();

        return response()->json(['message' => 'Séance supprimée.']);
    }

    /**
     * PATCH /api/seances/{seance}/status
     */
    public function updateStatus(Request $request, Seance $seance): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:scheduled,done,cancelled'],
        ]);

        $seance->update($data);

        return response()->json($seance);
    }

    private function validateData(Request $request, bool $required = true): array
    {
        $rule = $required ? 'required' : 'sometimes';

        return $request->validate([
            'module_id' => [$rule, 'exists:modules,id'],
            'professor_id' => [$rule, 'exists:professors,id'],
            'promotion_id' => [$rule, 'exists:promotions,id'],
            'room_id' => ['nullable', 'exists:rooms,id'],
            'type' => [$rule, 'in:CM,TD,TP,Online'],
            'date' => [$rule, 'date'],
            'start_time' => [$rule, 'date_format:H:i'],
            'end_time' => [$rule, 'date_format:H:i', 'after:start_time'],
            'status' => ['sometimes', 'in:scheduled,done,cancelled'],
            'recurring' => ['boolean'],
            'recurrence_pattern' => ['nullable', 'string'],
        ]);
    }
}

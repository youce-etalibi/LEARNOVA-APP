<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Promotion::with('filiere:id,name,department_id')->withCount('students');

        if ($f = $request->query('filiere_id')) {
            $query->where('filiere_id', $f);
        }
        if ($year = $request->query('academic_year')) {
            $query->where('academic_year', $year);
        }

        return response()->json($query->orderByDesc('academic_year')->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'filiere_id' => ['required', 'exists:filieres,id'],
            'academic_year' => ['required', 'string', 'max:20'],
            'max_students' => ['required', 'integer', 'min:1', 'max:500'],
        ]);

        return response()->json(Promotion::create($data), 201);
    }

    public function show(Promotion $promotion): JsonResponse
    {
        return response()->json($promotion->load('filiere', 'students.user:id,name,email'));
    }

    public function update(Request $request, Promotion $promotion): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'filiere_id' => ['sometimes', 'exists:filieres,id'],
            'academic_year' => ['sometimes', 'string', 'max:20'],
            'max_students' => ['sometimes', 'integer', 'min:1', 'max:500'],
        ]);

        $promotion->update($data);

        return response()->json($promotion);
    }

    public function destroy(Promotion $promotion): JsonResponse
    {
        $promotion->delete();

        return response()->json(['message' => 'Promotion supprimée.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Filiere;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FiliereController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Filiere::with('department:id,name')->withCount(['promotions', 'modules']);

        if ($dept = $request->query('department_id')) {
            $query->where('department_id', $dept);
        }
        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:filieres,code'],
            'department_id' => ['required', 'exists:departments,id'],
            'level' => ['required', 'in:licence,master,doctorat'],
            'duration_years' => ['required', 'integer', 'min:1', 'max:8'],
        ]);

        return response()->json(Filiere::create($data), 201);
    }

    public function show(Filiere $filiere): JsonResponse
    {
        return response()->json($filiere->load('department:id,name', 'promotions', 'modules'));
    }

    public function update(Request $request, Filiere $filiere): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:50', 'unique:filieres,code,'.$filiere->id],
            'department_id' => ['sometimes', 'exists:departments,id'],
            'level' => ['sometimes', 'in:licence,master,doctorat'],
            'duration_years' => ['sometimes', 'integer', 'min:1', 'max:8'],
        ]);

        $filiere->update($data);

        return response()->json($filiere);
    }

    public function destroy(Filiere $filiere): JsonResponse
    {
        $filiere->delete();

        return response()->json(['message' => 'Filière supprimée.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::withCount(['filieres', 'professors'])->with('head:id,name,email');

        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%")->orWhere('code', 'ilike', "%{$search}%");
        }

        return response()->json($query->orderBy('name')->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:departments,code'],
            'head_id' => ['nullable', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        return response()->json(Department::create($data), 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json($department->load('head:id,name,email', 'filieres'));
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:50', 'unique:departments,code,'.$department->id],
            'head_id' => ['nullable', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        $department->update($data);

        return response()->json($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json(['message' => 'Département supprimé.']);
    }
}

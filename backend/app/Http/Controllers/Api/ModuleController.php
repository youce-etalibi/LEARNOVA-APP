<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Module::with('filiere:id,name');

        if ($f = $request->query('filiere_id')) {
            $query->where('filiere_id', $f);
        }
        if ($sem = $request->query('semester')) {
            $query->where('semester', $sem);
        }
        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%")->orWhere('code', 'ilike', "%{$search}%");
        }

        return response()->json($query->orderBy('semester')->orderBy('name')->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:modules,code'],
            'credits' => ['required', 'integer', 'min:0', 'max:60'],
            'hours_total' => ['nullable', 'integer', 'min:0'],
            'hours_cm' => ['nullable', 'integer', 'min:0'],
            'hours_td' => ['nullable', 'integer', 'min:0'],
            'hours_tp' => ['nullable', 'integer', 'min:0'],
            'filiere_id' => ['required', 'exists:filieres,id'],
            'semester' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        return response()->json(Module::create($data), 201);
    }

    public function show(Module $module): JsonResponse
    {
        return response()->json($module->load('filiere', 'professors.user:id,name'));
    }

    public function update(Request $request, Module $module): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:50', 'unique:modules,code,'.$module->id],
            'credits' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'hours_total' => ['nullable', 'integer', 'min:0'],
            'hours_cm' => ['nullable', 'integer', 'min:0'],
            'hours_td' => ['nullable', 'integer', 'min:0'],
            'hours_tp' => ['nullable', 'integer', 'min:0'],
            'filiere_id' => ['sometimes', 'exists:filieres,id'],
            'semester' => ['sometimes', 'integer', 'min:1', 'max:12'],
        ]);

        $module->update($data);

        return response()->json($module);
    }

    public function destroy(Module $module): JsonResponse
    {
        $module->delete();

        return response()->json(['message' => 'Module supprimé.']);
    }

    /**
     * Assign a professor to this module (professor_module pivot).
     */
    public function assignProfessor(Request $request, Module $module): JsonResponse
    {
        $data = $request->validate([
            'professor_id' => ['required', 'exists:professors,id'],
            'academic_year' => ['required', 'string', 'max:20'],
            'type' => ['required', 'in:CM,TD,TP'],
        ]);

        $module->professors()->syncWithoutDetaching([
            $data['professor_id'] => [
                'academic_year' => $data['academic_year'],
                'type' => $data['type'],
            ],
        ]);

        return response()->json($module->load('professors.user:id,name'));
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Grade::with([
            'student.user:id,name',
            'module:id,name,code',
            'professor.user:id,name',
        ]);

        // Students only see their own grades.
        if ($user->hasRole('Student') && $user->student) {
            $query->where('student_id', $user->student->id);
        }

        if ($m = $request->query('module_id')) {
            $query->where('module_id', $m);
        }
        if ($s = $request->query('student_id')) {
            $query->where('student_id', $s);
        }
        if ($sem = $request->query('semester')) {
            $query->where('semester', $sem);
        }
        if ($year = $request->query('academic_year')) {
            $query->where('academic_year', $year);
        }

        return response()->json($query->latest()->paginate($request->integer('per_page', 30)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'module_id' => ['required', 'exists:modules,id'],
            'professor_id' => ['nullable', 'exists:professors,id'],
            'academic_year' => ['required', 'string', 'max:20'],
            'semester' => ['required', 'integer', 'min:1', 'max:12'],
            'exam_type' => ['required', 'in:CC,TP,Final,Rattrapage'],
            'grade' => ['required', 'numeric', 'min:0', 'max:20'],
            'coefficient' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'comment' => ['nullable', 'string'],
        ]);

        $data['professor_id'] ??= auth('api')->user()->professor?->id;
        $data['entered_at'] = now();

        return response()->json(Grade::create($data)->load('student.user:id,name', 'module:id,name'), 201);
    }

    /**
     * POST /api/grades/bulk  — enter grades for many students at once.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'module_id' => ['required', 'exists:modules,id'],
            'academic_year' => ['required', 'string', 'max:20'],
            'semester' => ['required', 'integer', 'min:1', 'max:12'],
            'exam_type' => ['required', 'in:CC,TP,Final,Rattrapage'],
            'coefficient' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'grades' => ['required', 'array', 'min:1'],
            'grades.*.student_id' => ['required', 'exists:students,id'],
            'grades.*.grade' => ['required', 'numeric', 'min:0', 'max:20'],
        ]);

        $professorId = auth('api')->user()->professor?->id;
        $created = [];

        foreach ($payload['grades'] as $row) {
            $created[] = Grade::create([
                'student_id' => $row['student_id'],
                'module_id' => $payload['module_id'],
                'professor_id' => $professorId,
                'academic_year' => $payload['academic_year'],
                'semester' => $payload['semester'],
                'exam_type' => $payload['exam_type'],
                'grade' => $row['grade'],
                'coefficient' => $payload['coefficient'] ?? 1,
                'entered_at' => now(),
            ]);
        }

        return response()->json(['message' => count($created).' notes enregistrées.', 'count' => count($created)], 201);
    }

    public function update(Request $request, Grade $grade): JsonResponse
    {
        $data = $request->validate([
            'grade' => ['sometimes', 'numeric', 'min:0', 'max:20'],
            'coefficient' => ['sometimes', 'numeric', 'min:0', 'max:10'],
            'exam_type' => ['sometimes', 'in:CC,TP,Final,Rattrapage'],
            'comment' => ['nullable', 'string'],
        ]);

        $grade->update($data);

        return response()->json($grade);
    }

    public function destroy(Grade $grade): JsonResponse
    {
        $grade->delete();

        return response()->json(['message' => 'Note supprimée.']);
    }

    public function calculateModuleValidation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'module_id' => ['required', 'exists:modules,id'],
            'academic_year' => ['required', 'string', 'max:20'],
        ]);

        $service = new \App\Services\MoroccanAcademicService();
        $status = $service->calculateModuleStatus($data['student_id'], $data['module_id'], $data['academic_year']);

        return response()->json([
            'message' => 'Validation du module calculée.',
            'status' => $status,
        ]);
    }

    public function calculateSemesterCompensation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'semester' => ['required', 'integer', 'min:1', 'max:12'],
            'academic_year' => ['required', 'string', 'max:20'],
        ]);

        $service = new \App\Services\MoroccanAcademicService();
        $result = $service->calculateSemesterCompensation($data['student_id'], $data['semester'], $data['academic_year']);

        return response()->json([
            'message' => 'Compensation du semestre calculée.',
            'result' => $result,
        ]);
    }
}

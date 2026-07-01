<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    /**
     * GET /api/assignments/{assignment}/submissions — Professor lists homework submissions.
     */
    public function indexSubmissions(Assignment $assignment): JsonResponse
    {
        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor || $assignment->professor_id !== $professor->id) {
            return response()->json(['error' => 'Vous n\'êtes pas le correcteur de ce devoir.'], 403);
        }

        $submissions = Submission::with('student.user:id,name,email')
            ->where('assignment_id', $assignment->id)
            ->get();

        return response()->json($submissions);
    }

    /**
     * POST /api/assignments/{assignment}/submit — Student uploads homework.
     */
    public function submitHomework(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
        ]);

        $user = auth('api')->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['error' => 'Seuls les étudiants peuvent soumettre des devoirs.'], 403);
        }

        if (now()->isAfter($assignment->deadline)) {
            return response()->json(['error' => 'Date limite dépassée.'], 422);
        }

        $path = $request->file('file')->store('submissions', 'public');

        $submission = Submission::updateOrCreate(
            [
                'assignment_id' => $assignment->id,
                'student_id' => $student->id,
            ],
            [
                'file_path' => $path,
                'submitted_at' => now(),
                'grade' => null, // Clear grading on re-submission
                'feedback' => null,
                'graded_at' => null,
            ]
        );

        return response()->json([
            'message' => 'Devoir soumis avec succès.',
            'submission' => $submission,
        ], 201);
    }

    /**
     * POST /api/submissions/{submission}/grade — Professor grades homework.
     */
    public function gradeSubmission(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            'grade' => ['required', 'numeric', 'min:0', 'max:20'],
            'feedback' => ['nullable', 'string'],
        ]);

        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor || $submission->assignment->professor_id !== $professor->id) {
            return response()->json(['error' => 'Vous n\'êtes pas autorisé à corriger ce devoir.'], 403);
        }

        $submission->update([
            'grade' => $data['grade'],
            'feedback' => $data['feedback'] ?? null,
            'graded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Devoir corrigé et noté.',
            'submission' => $submission,
        ]);
    }

    /**
     * PUT /api/assignments/{assignment} — Professor updates homework details.
     */
    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor || $assignment->professor_id !== $professor->id) {
            return response()->json(['error' => 'Non autorisé.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deadline' => ['required', 'date'],
            'max_grade' => ['nullable', 'numeric'],
        ]);

        $assignment->update($data);

        return response()->json([
            'message' => 'Devoir mis à jour avec succès.',
            'assignment' => $assignment,
        ]);
    }

    /**
     * DELETE /api/assignments/{assignment} — Professor deletes homework.
     */
    public function destroy(Assignment $assignment): JsonResponse
    {
        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor || $assignment->professor_id !== $professor->id) {
            return response()->json(['error' => 'Non autorisé.'], 403);
        }

        $assignment->submissions()->delete();
        $assignment->delete();

        return response()->json([
            'message' => 'Devoir supprimé avec succès.',
        ]);
    }
}

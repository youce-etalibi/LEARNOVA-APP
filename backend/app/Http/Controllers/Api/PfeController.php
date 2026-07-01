<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PfeProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PfeController extends Controller
{
    /**
     * GET /api/pfe-projects — Coordinator/Admin list of all university projects.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PfeProject::with(['student.user:id,name,email', 'professor.user:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->paginate($request->integer('per_page', 30)));
    }

    /**
     * GET /api/pfe-projects/my-project — Student checks their own PFE project.
     */
    public function myProject(): JsonResponse
    {
        $user = auth('api')->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['error' => 'Profil étudiant introuvable.'], 403);
        }

        $project = PfeProject::with('professor.user:id,name')
            ->where('student_id', $student->id)
            ->firstOrFail();

        return response()->json($project);
    }

    /**
     * POST /api/pfe-projects — Student submits a PFE proposal.
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth('api')->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['error' => 'Seuls les étudiants réguliers peuvent soumettre un PFE.'], 403);
        }

        // Check if student already has a project
        if (PfeProject::where('student_id', $student->id)->exists()) {
            return response()->json(['error' => 'Vous avez déjà enregistré un projet PFE.'], 422);
        }

        $data = $request->validate([
            'professor_id' => ['required', 'exists:professors,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'supervisor_name' => ['nullable', 'string', 'max:255'],
        ]);

        $data['student_id'] = $student->id;
        $data['status'] = 'proposed';

        $project = PfeProject::create($data);

        return response()->json([
            'message' => 'Proposition PFE enregistrée.',
            'project' => $project->load('professor.user:id,name'),
        ], 201);
    }

    /**
     * GET /api/pfe-projects/assigned — Professor lists their PFE advisees.
     */
    public function assigned(): JsonResponse
    {
        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor) {
            return response()->json(['error' => 'Profil professeur introuvable.'], 403);
        }

        $projects = PfeProject::with('student.user:id,name,email')
            ->where('professor_id', $professor->id)
            ->get();

        return response()->json($projects);
    }

    /**
     * PATCH /api/pfe-projects/{pfe_project}/status — Professor updates status.
     */
    public function updateStatus(Request $request, PfeProject $pfeProject): JsonResponse
    {
        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor || $pfeProject->professor_id !== $professor->id) {
            return response()->json(['error' => 'Vous n\'êtes pas l\'encadrant de ce projet.'], 403);
        }

        $data = $request->validate([
            'status' => ['required', 'in:proposed,in_progress,submitted,validated,rejected'],
        ]);

        $pfeProject->update($data);

        return response()->json([
            'message' => 'Statut du projet PFE mis à jour.',
            'project' => $pfeProject,
        ]);
    }

    /**
     * PATCH /api/pfe-projects/{pfe_project}/grade — Professor grades PFE defense.
     */
    public function gradeDefense(Request $request, PfeProject $pfeProject): JsonResponse
    {
        $user = auth('api')->user();
        $professor = $user->professor;

        if (!$professor || $pfeProject->professor_id !== $professor->id) {
            return response()->json(['error' => 'Vous n\'êtes pas l\'encadrant de ce projet.'], 403);
        }

        $data = $request->validate([
            'grade' => ['required', 'numeric', 'min:0', 'max:20'],
            'status' => ['sometimes', 'in:validated,rejected'],
        ]);

        $data['status'] ??= ($data['grade'] >= 10) ? 'validated' : 'rejected';

        $pfeProject->update($data);

        return response()->json([
            'message' => 'Note de soutenance PFE enregistrée.',
            'project' => $pfeProject,
        ]);
    }

    /**
     * PATCH /api/pfe-projects/{pfe_project}/schedule-defense — Coordinator assigns defense date.
     */
    public function scheduleDefense(Request $request, PfeProject $pfeProject): JsonResponse
    {
        $data = $request->validate([
            'defense_date' => ['required', 'date'],
        ]);

        $pfeProject->update([
            'defense_date' => $data['defense_date'],
        ]);

        return response()->json([
            'message' => 'Date de soutenance programmée.',
            'project' => $pfeProject,
        ]);
    }
}

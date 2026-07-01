<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\Department;
use App\Models\Filiere;
use App\Models\Grade;
use App\Models\Module;
use App\Models\Promotion;
use App\Models\Seance;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard — stats tailored to the current user's role.
     */
    public function index(): JsonResponse
    {
        $user = auth('api')->user();

        if ($user->hasAnyRole(['SuperAdmin', 'Admin'])) {
            return response()->json($this->adminStats());
        }
        if ($user->hasRole('ManagementPedagogique')) {
            return response()->json($this->managementStats());
        }
        if ($user->hasRole('Professor')) {
            return response()->json($this->professorStats($user));
        }
        if ($user->hasRole('Student')) {
            return response()->json($this->studentStats($user));
        }

        return response()->json($this->learnerStats($user));
    }

    private function adminStats(): array
    {
        return [
            'role' => 'admin',
            'cards' => [
                'users' => User::count(),
                'students' => Student::count(),
                'departments' => Department::count(),
                'courses' => Course::count(),
            ],
            'users_by_role' => User::query()
                ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->selectRaw('roles.name as role, count(*) as total')
                ->groupBy('roles.name')->get(),
            'recent_users' => User::latest()->take(5)->get(['id', 'name', 'email', 'status', 'created_at']),
        ];
    }

    private function managementStats(): array
    {
        return [
            'role' => 'management',
            'cards' => [
                'filieres' => Filiere::count(),
                'promotions' => Promotion::count(),
                'modules' => Module::count(),
                'seances_today' => Seance::whereDate('date', today())->count(),
            ],
            'seances_this_week' => Seance::whereBetween('date', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'pending_absences' => Absence::where('status', 'absent')->count(),
        ];
    }

    private function professorStats(User $user): array
    {
        $profId = $user->professor?->id;

        return [
            'role' => 'professor',
            'cards' => [
                'my_modules' => $user->professor?->modules()->count() ?? 0,
                'my_seances' => Seance::where('professor_id', $profId)->count(),
                'seances_today' => Seance::where('professor_id', $profId)->whereDate('date', today())->count(),
                'my_courses' => Course::where('professor_id', $profId)->count(),
            ],
            'upcoming_seances' => Seance::with('module:id,name', 'promotion:id,name', 'room:id,name')
                ->where('professor_id', $profId)
                ->whereDate('date', '>=', today())
                ->orderBy('date')->orderBy('start_time')
                ->take(5)->get(),
        ];
    }

    private function studentStats(User $user): array
    {
        $student = $user->student;
        $grades = $student ? Grade::where('student_id', $student->id)->get() : collect();

        return [
            'role' => 'student',
            'cards' => [
                'average' => $grades->count() ? round($grades->avg('grade'), 2) : null,
                'modules_graded' => $grades->pluck('module_id')->unique()->count(),
                'absences' => $student ? Absence::where('student_id', $student->id)->whereIn('status', ['absent', 'late'])->count() : 0,
                'enrolled_courses' => $user->enrollments()->count(),
            ],
            'upcoming_seances' => $student && $student->promotion_id
                ? Seance::with('module:id,name', 'room:id,name')
                    ->where('promotion_id', $student->promotion_id)
                    ->whereDate('date', '>=', today())
                    ->orderBy('date')->orderBy('start_time')->take(5)->get()
                : [],
            'recent_grades' => $student
                ? Grade::with('module:id,name')->where('student_id', $student->id)->latest()->take(5)->get()
                : [],
        ];
    }

    private function learnerStats(User $user): array
    {
        return [
            'role' => 'learner',
            'cards' => [
                'enrolled_courses' => $user->enrollments()->count(),
                'available_courses' => Course::where('is_free', true)->where('status', 'published')->count(),
            ],
            'announcements' => Announcement::whereNotNull('published_at')->latest('published_at')->take(5)->get(['id', 'title', 'published_at']),
        ];
    }
}

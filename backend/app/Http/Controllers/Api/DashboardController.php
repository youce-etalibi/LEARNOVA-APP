<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\CourseEnrollment;
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
        $now = now();
        $monthStart = $now->copy()->startOfMonth();
        $prevMonthStart = $monthStart->copy()->subMonth();
        $trendFrom = $now->copy()->subMonths(11)->startOfMonth();

        // 12-month registration & enrollment series (grouped in PHP — small volumes, DB-agnostic).
        $userMonths = User::where('created_at', '>=', $trendFrom)->pluck('created_at')
            ->groupBy(fn ($d) => $d->format('Y-m'))->map->count();
        $enrollMonths = CourseEnrollment::where('created_at', '>=', $trendFrom)->pluck('created_at')
            ->groupBy(fn ($d) => $d->format('Y-m'))->map->count();

        $monthly = collect(range(0, 11))->map(function ($i) use ($trendFrom, $userMonths, $enrollMonths) {
            $m = $trendFrom->copy()->addMonths($i);
            $key = $m->format('Y-m');

            return [
                'month' => $key,
                'users' => $userMonths[$key] ?? 0,
                'enrollments' => $enrollMonths[$key] ?? 0,
            ];
        })->values();

        // Attendance over the last 8 weeks, bucketed by the seance's week.
        $weekFrom = $now->copy()->subWeeks(7)->startOfWeek();
        $attendanceRows = Absence::join('seances', 'seances.id', '=', 'absences.seance_id')
            ->where('seances.date', '>=', $weekFrom->toDateString())
            ->get(['absences.status', 'seances.date as seance_date']);

        $attendance = collect(range(0, 7))->map(function ($i) use ($weekFrom, $attendanceRows) {
            $start = $weekFrom->copy()->addWeeks($i);
            $end = $start->copy()->endOfWeek();
            $bucket = $attendanceRows->filter(fn ($r) => $r->seance_date >= $start->toDateString() && $r->seance_date <= $end->toDateString());

            return [
                'week' => $start->format('Y-m-d'),
                'present' => $bucket->where('status', 'present')->count(),
                'late' => $bucket->where('status', 'late')->count(),
                'justified' => $bucket->where('status', 'justified')->count(),
                'absent' => $bucket->where('status', 'absent')->count(),
            ];
        })->values();

        $newUsersThisMonth = User::where('created_at', '>=', $monthStart)->count();
        $newUsersPrevMonth = User::whereBetween('created_at', [$prevMonthStart, $monthStart])->count();
        $newEnrollThisMonth = CourseEnrollment::where('created_at', '>=', $monthStart)->count();
        $newEnrollPrevMonth = CourseEnrollment::whereBetween('created_at', [$prevMonthStart, $monthStart])->count();

        return [
            'role' => 'admin',
            'cards' => [
                'users' => User::count(),
                'students' => Student::count(),
                'departments' => Department::count(),
                'courses' => Course::count(),
            ],
            'deltas' => [
                'users' => ['current' => $newUsersThisMonth, 'previous' => $newUsersPrevMonth],
                'enrollments' => ['current' => $newEnrollThisMonth, 'previous' => $newEnrollPrevMonth],
            ],
            'totals' => [
                'enrollments' => CourseEnrollment::count(),
                'modules' => Module::count(),
                'seances_today' => Seance::whereDate('date', today())->count(),
                'pending_justifications' => \App\Models\Justification::where('status', 'pending')->count(),
                'active_students' => Student::where('status', 'active')->count(),
            ],
            'monthly_activity' => $monthly,
            'attendance_weeks' => $attendance,
            'users_by_role' => User::query()
                ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->selectRaw('roles.name as role, count(*) as total')
                ->groupBy('roles.name')->orderByDesc('total')->get(),
            'students_by_filiere' => Student::query()
                ->join('promotions', 'promotions.id', '=', 'students.promotion_id')
                ->join('filieres', 'filieres.id', '=', 'promotions.filiere_id')
                ->selectRaw('filieres.name as filiere, count(*) as total')
                ->groupBy('filieres.name')->orderByDesc('total')->get(),
            'course_status' => Course::selectRaw('status, count(*) as total')
                ->groupBy('status')->pluck('total', 'status'),
            'top_courses' => Course::withCount('enrollments')
                ->withAvg('enrollments as avg_progress', 'progress_percent')
                ->orderByDesc('enrollments_count')
                ->take(5)->get(['id', 'title', 'status', 'is_free']),
            'seances_by_status' => Seance::whereBetween('date', [$now->copy()->startOfWeek()->toDateString(), $now->copy()->endOfWeek()->toDateString()])
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')->pluck('total', 'status'),
            'recent_users' => User::latest()->take(6)->get(['id', 'name', 'email', 'status', 'created_at']),
        ];
    }

    private function managementStats(): array
    {
        $weekStart = now()->startOfWeek();
        $weekEnd = now()->endOfWeek();

        $weekSeances = Seance::whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get(['id', 'date', 'status']);

        $weekByDay = collect(range(0, 6))->map(function ($i) use ($weekStart, $weekSeances) {
            $day = $weekStart->copy()->addDays($i);
            $bucket = $weekSeances->filter(fn ($s) => $s->date->isSameDay($day));

            return [
                'date' => $day->toDateString(),
                'total' => $bucket->count(),
                'done' => $bucket->where('status', 'done')->count(),
                'cancelled' => $bucket->where('status', 'cancelled')->count(),
            ];
        })->values();

        return [
            'role' => 'management',
            'cards' => [
                'filieres' => Filiere::count(),
                'promotions' => Promotion::count(),
                'modules' => Module::count(),
                'seances_today' => Seance::whereDate('date', today())->count(),
            ],
            'seances_this_week' => $weekSeances->count(),
            'seances_week_by_day' => $weekByDay,
            'seances_by_status' => $weekSeances->groupBy('status')->map->count(),
            'students_by_filiere' => Student::query()
                ->join('promotions', 'promotions.id', '=', 'students.promotion_id')
                ->join('filieres', 'filieres.id', '=', 'promotions.filiere_id')
                ->selectRaw('filieres.name as filiere, count(*) as total')
                ->groupBy('filieres.name')->orderByDesc('total')->get(),
            'modules_unassigned_count' => Module::doesntHave('professors')->count(),
            'modules_unassigned' => Module::doesntHave('professors')
                ->with('filiere:id,name')
                ->take(6)->get(['id', 'name', 'code', 'filiere_id', 'semester']),
            'today_seances' => Seance::with([
                'module:id,name', 'promotion:id,name', 'room:id,name',
                'professor:id,user_id', 'professor.user:id,name',
            ])->whereDate('date', today())->orderBy('start_time')->take(8)->get(),
            'pending_justifications' => \App\Models\Justification::where('status', 'pending')->count(),
            'recent_justifications' => \App\Models\Justification::with([
                'absence.student.user:id,name',
                'absence.seance.module:id,name',
            ])->where('status', 'pending')->latest()->take(5)->get(),
        ];
    }

    private function professorStats(User $user): array
    {
        $prof = $user->professor;
        $profId = $prof?->id;

        $upcoming = Seance::with('module:id,name', 'promotion:id,name', 'room:id,name')
            ->where('professor_id', $profId)
            ->whereDate('date', '>=', today())
            ->orderBy('date')->orderBy('start_time')
            ->take(6)->get();

        // Grade distribution across everything this professor graded.
        $gradeValues = Grade::where('professor_id', $profId)->pluck('grade');
        $buckets = [
            ['label' => '0–5', 'min' => 0, 'max' => 5],
            ['label' => '5–8', 'min' => 5, 'max' => 8],
            ['label' => '8–10', 'min' => 8, 'max' => 10],
            ['label' => '10–12', 'min' => 10, 'max' => 12],
            ['label' => '12–14', 'min' => 12, 'max' => 14],
            ['label' => '14–16', 'min' => 14, 'max' => 16],
            ['label' => '16–20', 'min' => 16, 'max' => 20.01],
        ];
        $distribution = collect($buckets)->map(fn ($b) => [
            'range' => $b['label'],
            'total' => $gradeValues->filter(fn ($g) => $g >= $b['min'] && $g < $b['max'])->count(),
        ])->values();

        // Attendance in this professor's seances over the last 30 days.
        $attendance = Absence::join('seances', 'seances.id', '=', 'absences.seance_id')
            ->where('seances.professor_id', $profId)
            ->where('seances.date', '>=', now()->subDays(30)->toDateString())
            ->selectRaw('absences.status, count(*) as total')
            ->groupBy('absences.status')->pluck('total', 'status');

        return [
            'role' => 'professor',
            'cards' => [
                'my_modules' => $prof?->modules()->count() ?? 0,
                'my_seances' => Seance::where('professor_id', $profId)->whereDate('date', '>=', today())->count(),
                'seances_today' => Seance::where('professor_id', $profId)->whereDate('date', today())->count(),
                'my_courses' => Course::where('professor_id', $profId)->count(),
            ],
            'upcoming_seances' => $upcoming,
            'my_modules_list' => $prof
                ? $prof->modules()->with('filiere:id,name')->withCount('seances')->get()
                : [],
            'grade_distribution' => $distribution,
            'grades_entered' => $gradeValues->count(),
            'grades_average' => $gradeValues->count() ? round($gradeValues->avg(), 2) : null,
            'attendance_summary' => $attendance,
            'my_courses_list' => Course::where('professor_id', $profId)
                ->withCount('enrollments')
                ->withAvg('enrollments as avg_progress', 'progress_percent')
                ->orderByDesc('enrollments_count')
                ->take(5)->get(['id', 'title', 'status', 'is_free']),
        ];
    }

    private function studentStats(User $user): array
    {
        $student = $user->student;
        $grades = $student ? Grade::with('module:id,name')->where('student_id', $student->id)->get() : collect();

        $gradesByModule = $grades->groupBy('module_id')->map(fn ($g) => [
            'module' => $g->first()->module?->name ?? '—',
            'average' => round($g->avg('grade'), 2),
        ])->values();

        $attendance = $student
            ? Absence::where('student_id', $student->id)
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')->pluck('total', 'status')
            : collect();

        return [
            'role' => 'student',
            'cards' => [
                'average' => $grades->count() ? round($grades->avg('grade'), 2) : null,
                'modules_graded' => $grades->pluck('module_id')->unique()->count(),
                'absences' => $student ? Absence::where('student_id', $student->id)->whereIn('status', ['absent', 'late'])->count() : 0,
                'enrolled_courses' => $user->enrollments()->count(),
            ],
            'promotion' => $student?->promotion()->with('filiere:id,name')->first(['id', 'name', 'filiere_id', 'academic_year']),
            'upcoming_seances' => $student && $student->promotion_id
                ? Seance::with('module:id,name', 'room:id,name')
                    ->where('promotion_id', $student->promotion_id)
                    ->whereDate('date', '>=', today())
                    ->orderBy('date')->orderBy('start_time')->take(6)->get()
                : [],
            'recent_grades' => $student
                ? Grade::with('module:id,name')->where('student_id', $student->id)->latest()->take(5)->get()
                : [],
            'grades_by_module' => $gradesByModule,
            'attendance_summary' => $attendance,
            'course_progress' => $user->enrollments()
                ->with('course:id,title,thumbnail,status,level')
                ->latest('updated_at')->take(4)->get(),
            'announcements' => Announcement::whereNotNull('published_at')
                ->latest('published_at')->take(4)->get(['id', 'title', 'published_at']),
        ];
    }

    private function learnerStats(User $user): array
    {
        $enrollments = $user->enrollments()->with('course:id,title,thumbnail,status,level,is_free')->get();
        $enrolledIds = $enrollments->pluck('course_id');

        return [
            'role' => 'learner',
            'cards' => [
                'enrolled_courses' => $enrollments->count(),
                'completed_courses' => $enrollments->whereNotNull('completed_at')->count(),
                'avg_progress' => $enrollments->count() ? round($enrollments->avg('progress_percent')) : 0,
                'available_courses' => Course::where('is_free', true)->where('status', 'published')->count(),
            ],
            'continue_learning' => $enrollments
                ->whereNull('completed_at')
                ->sortByDesc('updated_at')
                ->take(4)->values(),
            'recommended_courses' => Course::where('status', 'published')
                ->whereNotIn('id', $enrolledIds)
                ->withCount('enrollments')
                ->orderByDesc('enrollments_count')
                ->take(4)->get(['id', 'title', 'thumbnail', 'level', 'is_free', 'status']),
            'announcements' => Announcement::whereNotNull('published_at')
                ->latest('published_at')->take(5)->get(['id', 'title', 'published_at']),
        ];
    }
}

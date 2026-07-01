<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    /**
     * GET /api/courses — catalog. Public/free courses for everyone; scoped otherwise.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Course::with('professor.user:id,name', 'module:id,name')
            ->withCount('enrollments');

        if ($request->boolean('free_only')) {
            $query->where('is_free', true);
        }
        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        // Non-staff only see published courses.
        $user = auth('api')->user();
        if (! $user || $user->hasRole('Student') || $user->hasRole('AutoFormation')) {
            $query->where('status', 'published');
        }

        return response()->json($query->latest()->paginate($request->integer('per_page', 12)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'module_id' => ['nullable', 'exists:modules,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string'],
            'status' => ['nullable', 'in:draft,published'],
            'is_free' => ['boolean'],
            'level' => ['nullable', 'in:beginner,intermediate,advanced'],
            'language' => ['nullable', 'string', 'max:10'],
        ]);

        $data['professor_id'] = auth('api')->user()->professor?->id;

        return response()->json(Course::create($data), 201);
    }

    public function show(Course $course): JsonResponse
    {
        $course->load('sections.lessons', 'professor.user:id,name', 'module:id,name');

        $enrollment = null;
        if ($user = auth('api')->user()) {
            $enrollment = CourseEnrollment::where('user_id', $user->id)
                ->where('course_id', $course->id)->first();
        }

        return response()->json(['course' => $course, 'enrollment' => $enrollment]);
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'module_id' => ['nullable', 'exists:modules,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:draft,published'],
            'is_free' => ['boolean'],
            'level' => ['sometimes', 'in:beginner,intermediate,advanced'],
            'language' => ['sometimes', 'string', 'max:10'],
        ]);

        $course->update($data);

        return response()->json($course);
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return response()->json(['message' => 'Cours supprimé.']);
    }

    /**
     * POST /api/courses/{course}/enroll
     */
    public function enroll(Course $course): JsonResponse
    {
        $user = auth('api')->user();

        $enrollment = CourseEnrollment::firstOrCreate(
            ['user_id' => $user->id, 'course_id' => $course->id],
            ['enrolled_at' => now(), 'source' => 'auto-formation'],
        );

        return response()->json($enrollment, 201);
    }

    /**
     * GET /api/my-courses — the current user's enrollments.
     */
    public function myCourses(): JsonResponse
    {
        $user = auth('api')->user();

        $enrollments = CourseEnrollment::with('course.professor.user:id,name')
            ->where('user_id', $user->id)
            ->latest('enrolled_at')
            ->get();

        return response()->json($enrollments);
    }
}

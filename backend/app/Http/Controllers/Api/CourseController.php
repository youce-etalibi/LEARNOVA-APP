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
            'promotion_ids' => ['nullable', 'array'],
            'promotion_ids.*' => ['exists:promotions,id'],
        ]);

        $data['professor_id'] = auth('api')->user()->professor?->id;

        $course = Course::create($data);
        if ($request->has('promotion_ids')) {
            $course->promotions()->sync($request->promotion_ids);
        }

        return response()->json($course->load('promotions'), 201);
    }

    public function show(Course $course): JsonResponse
    {
        $course->load('sections.lessons.quizzes', 'professor.user:id,name', 'module:id,name', 'promotions')
            ->loadCount('enrollments');

        $user = auth('api')->user();
        $enrollment = null;
        $completedLessonIds = [];
        if ($user) {
            $enrollment = CourseEnrollment::where('user_id', $user->id)
                ->where('course_id', $course->id)->first();

            if ($enrollment) {
                $completedLessonIds = \App\Models\LessonProgress::where('enrollment_id', $enrollment->id)
                    ->where('status', 'completed')
                    ->pluck('lesson_id');
            }
        }

        // Fetch assignments for the module of this course
        $assignments = \App\Models\Assignment::where('module_id', $course->module_id)
            ->withCount('submissions')
            ->get();

        // If the user is a student, attach their submission to the assignment object
        $quizAttempts = [];
        if ($user) {
            if ($user->student) {
                $studentId = $user->student->id;
                foreach ($assignments as $assignment) {
                    $assignment->student_submission = \App\Models\Submission::where('assignment_id', $assignment->id)
                        ->where('student_id', $studentId)
                        ->first();
                }

                $quizIds = $course->sections->flatMap->lessons->flatMap->quizzes->pluck('id');
                $quizAttempts = \App\Models\QuizAttempt::whereIn('quiz_id', $quizIds)
                    ->where('user_id', $user->id)
                    ->latest()
                    ->get();
            }
        }

        return response()->json([
            'course' => $course,
            'enrollment' => $enrollment,
            'assignments' => $assignments,
            'quizAttempts' => $quizAttempts,
            'completed_lesson_ids' => $completedLessonIds,
        ]);
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
            'promotion_ids' => ['nullable', 'array'],
            'promotion_ids.*' => ['exists:promotions,id'],
        ]);

        $course->update($data);
        if ($request->has('promotion_ids')) {
            $course->promotions()->sync($request->promotion_ids);
        }

        return response()->json($course->load('promotions'));
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

    /**
     * POST /api/courses/{course}/sections
     */
    public function storeSection(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'order_index' => ['nullable', 'integer'],
            'is_free_preview' => ['boolean'],
        ]);

        $section = $course->sections()->create($data);

        return response()->json($section, 201);
    }

    /**
     * POST /api/sections/{section}/lessons
     */
    public function storeLesson(Request $request, \App\Models\CourseSection $section): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:video,pdf,quiz,text,link'],
            'content_url' => ['nullable', 'string'],
            'content_text' => ['nullable', 'string'],
            'duration_minutes' => ['nullable', 'integer'],
            'order_index' => ['nullable', 'integer'],
        ]);

        $lesson = $section->lessons()->create($data);

        return response()->json($lesson, 201);
    }

    /**
     * POST /api/lessons/{lesson}/quizzes
     */
    public function storeQuiz(Request $request, \App\Models\Lesson $lesson): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'duration_minutes' => ['nullable', 'integer'],
            'attempts_allowed' => ['nullable', 'integer'],
            'passing_grade' => ['nullable', 'numeric'],
        ]);

        $courseId = $lesson->section->course_id;
        $course = Course::findOrFail($courseId);

        $data['lesson_id'] = $lesson->id;
        $data['module_id'] = $course->module_id ?? 1;

        $quiz = \App\Models\Quiz::create($data);

        return response()->json($quiz, 201);
    }

    /**
     * POST /api/courses/{course}/assignments
     */
    public function storeAssignment(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deadline' => ['required', 'date'],
            'max_grade' => ['nullable', 'numeric'],
            'type' => ['nullable', 'in:individual,group'],
        ]);

        $data['module_id'] = $course->module_id ?? 1;
        $data['professor_id'] = auth('api')->user()->professor?->id;

        $assignment = \App\Models\Assignment::create($data);

        return response()->json($assignment, 201);
    }
}

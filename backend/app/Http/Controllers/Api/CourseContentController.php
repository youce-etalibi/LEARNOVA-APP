<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseSection;
use App\Models\Lesson;
use App\Models\LessonProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseContentController extends Controller
{
    /* ---------------- Sections ---------------- */

    public function storeSection(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'is_free_preview' => ['boolean'],
        ]);

        $section = $course->sections()->create([
            'title' => $data['title'],
            'is_free_preview' => $data['is_free_preview'] ?? false,
            'order_index' => ($course->sections()->max('order_index') ?? 0) + 1,
        ]);

        return response()->json($section, 201);
    }

    public function updateSection(Request $request, CourseSection $section): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'is_free_preview' => ['boolean'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
        ]);

        $section->update($data);

        return response()->json($section);
    }

    public function destroySection(CourseSection $section): JsonResponse
    {
        $section->delete();

        return response()->json(['message' => 'Section supprimée.']);
    }

    /* ---------------- Leçons ---------------- */

    public function storeLesson(Request $request, CourseSection $section): JsonResponse
    {
        $data = $this->validateLesson($request);

        $lesson = $section->lessons()->create([
            ...$data,
            'order_index' => ($section->lessons()->max('order_index') ?? 0) + 1,
        ]);

        return response()->json($lesson, 201);
    }

    public function updateLesson(Request $request, Lesson $lesson): JsonResponse
    {
        $lesson->update($this->validateLesson($request, false));

        return response()->json($lesson);
    }

    public function destroyLesson(Lesson $lesson): JsonResponse
    {
        $lesson->delete();

        return response()->json(['message' => 'Leçon supprimée.']);
    }

    /* ---------------- Suivi (apprenant) ---------------- */

    /**
     * POST /api/lessons/{lesson}/toggle-complete — coche/décoche une leçon
     * et recalcule la progression de l'inscription.
     */
    public function toggleComplete(Lesson $lesson): JsonResponse
    {
        $user = auth('api')->user();
        $course = $lesson->section->course;

        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->firstOrFail();

        $progress = LessonProgress::firstOrNew([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
        ]);

        $nowCompleted = $progress->status !== 'completed';
        $progress->status = $nowCompleted ? 'completed' : 'not_started';
        $progress->completed_at = $nowCompleted ? now() : null;
        $progress->save();

        // Recalcule la progression globale du cours.
        $totalLessons = Lesson::whereIn(
            'section_id',
            $course->sections()->pluck('id'),
        )->count();

        $completed = LessonProgress::where('enrollment_id', $enrollment->id)
            ->where('status', 'completed')->count();

        $percent = $totalLessons ? (int) round($completed / $totalLessons * 100) : 0;
        $enrollment->update([
            'progress_percent' => $percent,
            'completed_at' => $percent >= 100 ? ($enrollment->completed_at ?? now()) : null,
        ]);

        return response()->json([
            'lesson_id' => $lesson->id,
            'completed' => $nowCompleted,
            'progress_percent' => $percent,
        ]);
    }

    private function validateLesson(Request $request, bool $required = true): array
    {
        $rule = $required ? 'required' : 'sometimes';

        return $request->validate([
            'title' => [$rule, 'string', 'max:255'],
            'type' => [$rule, 'in:video,pdf,quiz,text,link'],
            'content_url' => ['nullable', 'string', 'max:2048'],
            'content_text' => ['nullable', 'string'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}

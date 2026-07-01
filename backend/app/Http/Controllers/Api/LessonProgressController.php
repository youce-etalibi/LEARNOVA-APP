<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\CourseEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonProgressController extends Controller
{
    /**
     * POST /api/lessons/{lesson}/progress — Log study time and completion.
     */
    public function updateProgress(Request $request, Lesson $lesson): JsonResponse
    {
        $request->validate([
            'watched_seconds' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'in:not_started,in_progress,completed'],
        ]);

        $user = auth('api')->user();

        // 1. Get the enrollment for the course containing this lesson
        $courseId = $lesson->section->course_id;
        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->first();

        if (!$enrollment) {
            return response()->json(['error' => 'Vous n\'êtes pas inscrit à ce cours.'], 403);
        }

        // 2. Record or update progress
        $progress = LessonProgress::updateOrCreate(
            [
                'enrollment_id' => $enrollment->id,
                'lesson_id' => $lesson->id,
            ],
            [
                'status' => $request->status,
                'watched_seconds' => $request->watched_seconds,
                'completed_at' => ($request->status === 'completed') ? now() : null,
            ]
        );

        // 3. Recalculate course total progress percentage
        $totalLessons = Lesson::whereHas('section', function ($q) use ($courseId) {
            $q->where('course_id', $courseId);
        })->count();

        $completedLessons = LessonProgress::where('enrollment_id', $enrollment->id)
            ->where('status', 'completed')
            ->count();

        $progressPercent = $totalLessons > 0 ? (int)round(($completedLessons / $totalLessons) * 100) : 0;

        $enrollment->update([
            'progress_percent' => $progressPercent,
            'completed_at' => ($progressPercent === 100) ? now() : null,
        ]);

        return response()->json([
            'message' => 'Progression mise à jour.',
            'progress' => $progress,
            'course_progress_percent' => $progressPercent,
        ]);
    }
}

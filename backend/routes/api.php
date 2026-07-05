<?php

use App\Http\Controllers\Api\AbsenceController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\FiliereController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\ModuleController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SeanceController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PfeController;
use App\Http\Controllers\Api\LessonProgressController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\ChatController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json([
    'message' => 'pong from Learnova API',
    'timestamp' => now()->toIso8601String(),
]));

/*
|--------------------------------------------------------------------------
| Public / auth
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']); // auto-formation learners

    // Google OAuth — set GOOGLE_CLIENT_ID/SECRET in .env
    Route::post('google', [GoogleAuthController::class, 'loginWithToken']); // popup flow (@react-oauth/google)
    Route::get('google/redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('google/callback', [GoogleAuthController::class, 'callback']);

    Route::middleware('auth:api')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

// Public course catalog (browsable without auth)
Route::get('courses', [CourseController::class, 'index']);
Route::get('courses/{course}', [CourseController::class, 'show']);
Route::get('announcements', [AnnouncementController::class, 'index']);
Route::get('announcements/{announcement}', [AnnouncementController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Authenticated
|--------------------------------------------------------------------------
*/
Route::middleware('auth:api')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Profile (any authenticated user)
    Route::put('profile', [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'changePassword']);
    Route::post('profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::delete('profile/avatar', [ProfileController::class, 'deleteAvatar']);

    // E-learning (any authenticated user can enroll/learn)
    Route::get('my-courses', [CourseController::class, 'myCourses']);
    Route::post('courses/{course}/enroll', [CourseController::class, 'enroll']);
    Route::post('lessons/{lesson}/progress', [LessonProgressController::class, 'updateProgress']);
    Route::post('lessons/{lesson}/toggle-complete', [\App\Http\Controllers\Api\CourseContentController::class, 'toggleComplete']);
    Route::get('quizzes/{quiz}', [QuizController::class, 'show']);
    Route::get('quiz-attempts/{attempt}/review', [QuizController::class, 'review']);

    // Payments (any authenticated user)
    Route::get('payments', [PaymentController::class, 'index']);
    Route::post('payments/purchase-course', [PaymentController::class, 'purchaseCourse']);
    Route::post('payments/pay-invoice', [PaymentController::class, 'payInvoice']);

    /*
    | Admin / SuperAdmin — user & system management
    */
    Route::middleware('role:SuperAdmin|Admin')->group(function () {
        Route::get('users/roles', [UserController::class, 'roles']);
        Route::apiResource('users', UserController::class);
        Route::apiResource('departments', DepartmentController::class)->except(['index', 'show']);
        Route::apiResource('rooms', RoomController::class)->except(['index', 'show']);

        // Admin Billing & Invoicing
        Route::get('admin/payments', [PaymentController::class, 'adminPayments']);
        Route::get('admin/invoices', [PaymentController::class, 'adminInvoices']);
        Route::post('admin/invoices', [PaymentController::class, 'storeInvoice']);
    });

    // Departments & rooms — readable by staff (write rules above)
    Route::middleware('role:SuperAdmin|Admin|ManagementPedagogique|Professor')->group(function () {
        Route::get('departments', [DepartmentController::class, 'index']);
        Route::get('departments/{department}', [DepartmentController::class, 'show']);
        Route::get('rooms', [RoomController::class, 'index']);
        Route::get('rooms/{room}', [RoomController::class, 'show']);

        // Lightweight professors directory (for planning forms)
        Route::get('professors', fn () => response()->json(
            \App\Models\Professor::with('user:id,name')->get(['id', 'user_id', 'speciality'])
        ));
    });

    /*
    | Management pédagogique — academic structure & planning
    */
    Route::middleware('role:SuperAdmin|Admin|ManagementPedagogique')->group(function () {
        Route::apiResource('filieres', FiliereController::class)->except(['index', 'show']);
        Route::apiResource('promotions', PromotionController::class)->except(['index', 'show']);
        Route::apiResource('modules', ModuleController::class)->except(['index', 'show']);
        Route::post('modules/{module}/assign-professor', [ModuleController::class, 'assignProfessor']);
        Route::post('seances', [SeanceController::class, 'store']);
        Route::put('seances/{seance}', [SeanceController::class, 'update']);
        Route::delete('seances/{seance}', [SeanceController::class, 'destroy']);

        // PFE Coordinator actions
        Route::get('pfe-projects', [PfeController::class, 'index']);
        Route::patch('pfe-projects/{pfe_project}/schedule-defense', [PfeController::class, 'scheduleDefense']);
    });

    // Academic structure — readable by all staff + students
    Route::middleware('role:SuperAdmin|Admin|ManagementPedagogique|Professor|Student')->group(function () {
        Route::get('filieres', [FiliereController::class, 'index']);
        Route::get('filieres/{filiere}', [FiliereController::class, 'show']);
        Route::get('promotions', [PromotionController::class, 'index']);
        Route::get('promotions/{promotion}', [PromotionController::class, 'show']);
        Route::get('modules', [ModuleController::class, 'index']);
        Route::get('modules/{module}', [ModuleController::class, 'show']);

        // Seances — list/show is role-scoped inside the controller
        Route::get('seances', [SeanceController::class, 'index']);
        Route::get('seances/{seance}', [SeanceController::class, 'show']);

        // Grades & absences — read scoped by role in the controller
        Route::get('grades', [GradeController::class, 'index']);
        Route::get('absences', [AbsenceController::class, 'index']);
    });

    /*
    | Professor + academic staff — teaching actions
    */
    Route::middleware('role:SuperAdmin|Admin|ManagementPedagogique|Professor')->group(function () {
        Route::patch('seances/{seance}/status', [SeanceController::class, 'updateStatus']);

        Route::post('grades', [GradeController::class, 'store']);
        Route::post('grades/bulk', [GradeController::class, 'bulkStore']);
        Route::put('grades/{grade}', [GradeController::class, 'update']);
        Route::delete('grades/{grade}', [GradeController::class, 'destroy']);
        Route::post('grades/calculate-module-validation', [GradeController::class, 'calculateModuleValidation']);
        Route::post('grades/calculate-semester-compensation', [GradeController::class, 'calculateSemesterCompensation']);

        Route::post('absences/bulk', [AbsenceController::class, 'bulkStore']);
        Route::put('absences/{absence}', [AbsenceController::class, 'update']);
        Route::patch('justifications/{justification}/review', [AbsenceController::class, 'reviewJustification']);

        // Course authoring
        Route::post('courses', [CourseController::class, 'store']);
        Route::put('courses/{course}', [CourseController::class, 'update']);
        Route::delete('courses/{course}', [CourseController::class, 'destroy']);

        // Course content authoring (sections & lessons)
        Route::post('courses/{course}/sections', [\App\Http\Controllers\Api\CourseContentController::class, 'storeSection']);
        Route::put('sections/{section}', [\App\Http\Controllers\Api\CourseContentController::class, 'updateSection']);
        Route::delete('sections/{section}', [\App\Http\Controllers\Api\CourseContentController::class, 'destroySection']);
        Route::post('sections/{section}/lessons', [\App\Http\Controllers\Api\CourseContentController::class, 'storeLesson']);
        Route::put('lessons/{lesson}', [\App\Http\Controllers\Api\CourseContentController::class, 'updateLesson']);
        Route::delete('lessons/{lesson}', [\App\Http\Controllers\Api\CourseContentController::class, 'destroyLesson']);

        Route::post('lessons/{lesson}/quizzes', [CourseController::class, 'storeQuiz']);
        Route::post('courses/{course}/assignments', [CourseController::class, 'storeAssignment']);

        // Quiz Question Builder
        Route::post('quizzes/{quiz}/questions', [QuizController::class, 'addQuestion']);
        Route::get('question-banks', [QuizController::class, 'indexQuestionBank']);
        Route::post('question-banks', [QuizController::class, 'storeQuestionBank']);
        Route::post('quizzes/{quiz}/import-question', [QuizController::class, 'importQuestion']);
        Route::get('quizzes/{quiz}/attempts', [QuizController::class, 'indexAttempts']);

        // Homework Submissions & Grading
        Route::get('assignments/{assignment}/submissions', [AssignmentController::class, 'indexSubmissions']);
        Route::post('submissions/{submission}/grade', [AssignmentController::class, 'gradeSubmission']);
        Route::put('assignments/{assignment}', [AssignmentController::class, 'update']);
        Route::delete('assignments/{assignment}', [AssignmentController::class, 'destroy']);

        // QR Attendance & Justifications Review
        Route::post('seances/{seance}/qr-tokens', [AbsenceController::class, 'generateQrToken']);
        Route::patch('justifications/{justification}/review', [AbsenceController::class, 'reviewJustification']);

        // Announcements authoring
        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}', [AnnouncementController::class, 'update']);
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        // PFE Professor actions
        Route::get('professor/pfe-projects', [PfeController::class, 'assigned']);
        Route::patch('pfe-projects/{pfe_project}/status', [PfeController::class, 'updateStatus']);
        Route::patch('pfe-projects/{pfe_project}/grade', [PfeController::class, 'gradeDefense']);
    });

    // Chat & Communication System (all authenticated users)
    Route::get('chat/conversations', [ChatController::class, 'index']);
    Route::get('chat/conversations/{id}', [ChatController::class, 'show']);
    Route::post('chat/messages', [ChatController::class, 'store']);
    Route::post('chat/conversations/direct', [ChatController::class, 'startDirect']);
    Route::post('chat/conversations/group', [ChatController::class, 'createGroup']);
    Route::get('chat/contacts', [ChatController::class, 'getEligibleContacts']);
    Route::get('chat/unread-count', [ChatController::class, 'getUnreadCount']);

    /*
    | Student — justify own absences & PFE
    */
    Route::middleware('role:Student')->group(function () {
        Route::post('absences/{absence}/justify', [AbsenceController::class, 'justify']);

        // Student PFE routes
        Route::get('my-pfe', [PfeController::class, 'myProject']);
        Route::post('pfe-projects', [PfeController::class, 'store']);

        // Quiz attempts
        Route::post('quizzes/{quiz}/attempts', [QuizController::class, 'startAttempt']);
        Route::post('quiz-attempts/{attempt}/submit', [QuizController::class, 'submitAttempt']);
        Route::post('quiz-attempts/{attempt}/infraction', [QuizController::class, 'logInfraction']);

        // Homework submission
        Route::post('assignments/{assignment}/submit', [AssignmentController::class, 'submitHomework']);

        // QR Check-in & Justifications upload
        Route::post('absences/scan-qr', [AbsenceController::class, 'scanQrCode']);
        Route::post('absences/{absence}/justify', [AbsenceController::class, 'justify']);
    });
});

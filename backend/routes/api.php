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

    // Google OAuth (Laravel Socialite) — set GOOGLE_CLIENT_ID/SECRET in .env
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

    // E-learning (any authenticated user can enroll/learn)
    Route::get('my-courses', [CourseController::class, 'myCourses']);
    Route::post('courses/{course}/enroll', [CourseController::class, 'enroll']);

    /*
    | Admin / SuperAdmin — user & system management
    */
    Route::middleware('role:SuperAdmin|Admin')->group(function () {
        Route::get('users/roles', [UserController::class, 'roles']);
        Route::apiResource('users', UserController::class);
        Route::apiResource('departments', DepartmentController::class)->except(['index', 'show']);
        Route::apiResource('rooms', RoomController::class)->except(['index', 'show']);
    });

    // Departments & rooms — readable by staff (write rules above)
    Route::middleware('role:SuperAdmin|Admin|ManagementPedagogique|Professor')->group(function () {
        Route::get('departments', [DepartmentController::class, 'index']);
        Route::get('departments/{department}', [DepartmentController::class, 'show']);
        Route::get('rooms', [RoomController::class, 'index']);
        Route::get('rooms/{room}', [RoomController::class, 'show']);
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

        Route::post('absences/bulk', [AbsenceController::class, 'bulkStore']);
        Route::put('absences/{absence}', [AbsenceController::class, 'update']);
        Route::patch('justifications/{justification}/review', [AbsenceController::class, 'reviewJustification']);

        // Course authoring
        Route::post('courses', [CourseController::class, 'store']);
        Route::put('courses/{course}', [CourseController::class, 'update']);
        Route::delete('courses/{course}', [CourseController::class, 'destroy']);

        // Announcements authoring
        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}', [AnnouncementController::class, 'update']);
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy']);
    });

    /*
    | Student — justify own absences
    */
    Route::middleware('role:Student')->group(function () {
        Route::post('absences/{absence}/justify', [AbsenceController::class, 'justify']);
    });
});

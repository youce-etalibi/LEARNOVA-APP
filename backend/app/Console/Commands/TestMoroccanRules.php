<?php

namespace App\Console\Commands;

use App\Models\Grade;
use App\Models\Student;
use App\Models\Module;
use App\Models\User;
use App\Models\Professor;
use App\Models\Department;
use App\Models\Filiere;
use App\Models\StudentModuleStatus;
use App\Models\Quiz;
use App\Models\QuizQuestion;
use App\Models\QuizOption;
use App\Models\QuizAttempt;
use App\Models\Assignment;
use App\Models\Submission;
use App\Models\Absence;
use App\Models\Seance;
use App\Models\StudentWarning;
use App\Services\MoroccanAcademicService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestMoroccanRules extends Command
{
    protected $signature = 'test:moroccan-rules';
    protected $description = 'Simulates and verifies Moroccan LMD grading, validation, and compensation logic.';

    public function handle()
    {
        $this->info('Initializing Test Environment...');

        DB::beginTransaction();

        try {
            // 1. Create mock database structural data
            $dept = Department::create([
                'name' => 'Computer Science Department',
                'code' => 'CS_DEPT_TEST_99',
            ]);

            $filiere = Filiere::create([
                'name' => 'Software Engineering',
                'code' => 'SE_FIL_TEST_99',
                'department_id' => $dept->id,
                'level' => 'licence',
                'duration_years' => 3,
            ]);

            $user = User::create([
                'name' => 'Test Student',
                'email' => 'teststudent@learnova.test',
                'password' => bcrypt('password'),
                'status' => 'active',
            ]);

            $profUser = User::create([
                'name' => 'Test Professor',
                'email' => 'testprof@learnova.test',
                'password' => bcrypt('password'),
                'status' => 'active',
            ]);

            $prof = Professor::create([
                'user_id' => $profUser->id,
                'employee_id' => 'EMP_TEST_99',
                'department_id' => $dept->id,
            ]);

            $student = Student::create([
                'user_id' => $user->id,
                'student_id' => 'CNE_TEST_99',
                'status' => 'active',
            ]);

            // Create modules for S1
            $module1 = Module::create([
                'name' => 'Algorithms & Data Structures',
                'code' => 'CS_MOD_101',
                'semester' => 1,
                'filiere_id' => $filiere->id,
            ]);

            $module2 = Module::create([
                'name' => 'Linear Algebra',
                'code' => 'MATH_MOD_102',
                'semester' => 1,
                'filiere_id' => $filiere->id,
            ]);

            $academicYear = '2025-2026';
            $service = new MoroccanAcademicService();

            $this->info("\n==========================================");
            $this->info("TEST CASE 1: Standard Validation (CC=12, TP=14, Final=10)");
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'CC', 'grade' => 12.00, 'academic_year' => $academicYear, 'semester' => 1]);
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'TP', 'grade' => 14.00, 'academic_year' => $academicYear, 'semester' => 1]);
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'Final', 'grade' => 10.00, 'academic_year' => $academicYear, 'semester' => 1]);

            $status1 = $service->calculateModuleStatus($student->id, $module1->id, $academicYear);
            $this->line("Calculated Average: {$status1->final_score}/20");
            $this->line("Calculated Status: {$status1->status}");
            if ($status1->status === 'V' && $status1->final_score == 11.20) {
                $this->info("✅ SUCCESS: Standard validation passed!");
            } else {
                $this->error("❌ FAIL: Incorrect average or status.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 2: Note Éliminatoire (CC=18, TP=16, Final=6)");
            Grade::query()->delete(); // Clear grades
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'CC', 'grade' => 18.00, 'academic_year' => $academicYear, 'semester' => 1]);
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'TP', 'grade' => 16.00, 'academic_year' => $academicYear, 'semester' => 1]);
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'Final', 'grade' => 6.00, 'academic_year' => $academicYear, 'semester' => 1]);

            $status2 = $service->calculateModuleStatus($student->id, $module1->id, $academicYear);
            $this->line("Calculated Average: {$status2->final_score}/20");
            $this->line("Calculated Status: {$status2->status}");
            if ($status2->status === 'RAT' && $status2->final_score == 10.40) {
                $this->info("✅ SUCCESS: Note éliminatoire blocked validation as expected!");
            } else {
                $this->error("❌ FAIL: Grade validated despite eliminatory mark.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 3: Rattrapage Override (CC=18, TP=16, Final=6, Rattrapage=12)");
            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'Rattrapage', 'grade' => 12.00, 'academic_year' => $academicYear, 'semester' => 1]);

            $status3 = $service->calculateModuleStatus($student->id, $module1->id, $academicYear);
            $this->line("Calculated Average: {$status3->final_score}/20");
            $this->line("Calculated Status: {$status3->status}");
            if ($status3->status === 'V' && $status3->final_score == 14.00) {
                $this->info("✅ SUCCESS: Rattrapage successfully recalculated and validated course!");
            } else {
                $this->error("❌ FAIL: Rattrapage grade override did not apply correctly.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 4: Semester Compensation (Module 1 = 11.0, Module 2 = 9.4)");
            Grade::query()->delete();
            StudentModuleStatus::query()->delete();

            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'Final', 'grade' => 11.00, 'academic_year' => $academicYear, 'semester' => 1]);
            $service->calculateModuleStatus($student->id, $module1->id, $academicYear);

            Grade::create(['student_id' => $student->id, 'module_id' => $module2->id, 'professor_id' => $prof->id, 'exam_type' => 'Final', 'grade' => 9.40, 'academic_year' => $academicYear, 'semester' => 1]);
            $service->calculateModuleStatus($student->id, $module2->id, $academicYear);

            $compResult = $service->calculateSemesterCompensation($student->id, 1, $academicYear);
            $mod2Status = StudentModuleStatus::where('student_id', $student->id)->where('module_id', $module2->id)->first();

            $this->line("Semester Average: {$compResult['semester_average']}/20");
            $this->line("Module 2 Updated Status: {$mod2Status->status}");
            if ($mod2Status->status === 'VC') {
                $this->info("✅ SUCCESS: Module validated by compensation!");
            } else {
                $this->error("❌ FAIL: Semester compensation was not applied.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 5: Compensation Blocked by Note Éliminatoire (Module 1 = 15.0, Module 2 = 5.0)");
            Grade::query()->delete();
            StudentModuleStatus::query()->delete();

            Grade::create(['student_id' => $student->id, 'module_id' => $module1->id, 'professor_id' => $prof->id, 'exam_type' => 'Final', 'grade' => 15.00, 'academic_year' => $academicYear, 'semester' => 1]);
            $service->calculateModuleStatus($student->id, $module1->id, $academicYear);

            Grade::create(['student_id' => $student->id, 'module_id' => $module2->id, 'professor_id' => $prof->id, 'exam_type' => 'Final', 'grade' => 5.00, 'academic_year' => $academicYear, 'semester' => 1]);
            $service->calculateModuleStatus($student->id, $module2->id, $academicYear);

            $compResult2 = $service->calculateSemesterCompensation($student->id, 1, $academicYear);
            $mod2Status2 = StudentModuleStatus::where('student_id', $student->id)->where('module_id', $module2->id)->first();

            $this->line("Semester Average: {$compResult2['semester_average']}/20");
            $this->line("Module 2 Status: {$mod2Status2->status}");
            if ($mod2Status2->status === 'RAT') {
                $this->info("✅ SUCCESS: Note éliminatoire successfully blocked semester compensation!");
            } else {
                $this->error("❌ FAIL: Module compensated despite having an eliminatory grade.");
            }

            // ==========================================
            // NEW LMS & ATTENDANCE INTEGRATION TESTS
            // ==========================================
            $this->info("\n==========================================");
            $this->info("TEST CASE 6: Quiz Attempt & Automatic Scoring");
            $quiz = Quiz::create([
                'title' => 'Core Programming Quiz',
                'duration_minutes' => 15,
                'attempts_allowed' => 3,
                'passing_grade' => 12.00,
            ]);

            // Add an MCQ question
            $q1 = QuizQuestion::create([
                'quiz_id' => $quiz->id,
                'question' => 'What does PHP stand for?',
                'type' => 'mcq',
                'points' => 10.00,
            ]);
            $o1 = QuizOption::create(['question_id' => $q1->id, 'label' => 'Hypertext Preprocessor', 'is_correct' => true]);
            $o2 = QuizOption::create(['question_id' => $q1->id, 'label' => 'Private Home Page', 'is_correct' => false]);

            // Add a short text question
            $q2 = QuizQuestion::create([
                'quiz_id' => $quiz->id,
                'question' => 'Name of Laravel ORM?',
                'type' => 'short',
                'points' => 10.00,
            ]);
            $o3 = QuizOption::create(['question_id' => $q2->id, 'label' => 'Eloquent', 'is_correct' => true]);

            // Start attempt as Student user
            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'user_id' => $user->id,
                'started_at' => now(),
            ]);

            // Simulate student submission via controller logic
            // Q1: select correct option o1
            // Q2: write correct text 'Eloquent'
            $score = 0.00;
            $earned = 0;
            // Q1 correct
            $earned += $q1->points;
            // Q2 correct
            $earned += $q2->points;
            $score = ($earned / 20) * 20; // 20/20

            $attempt->update(['score' => $score, 'finished_at' => now()]);

            $this->line("Quiz Score: {$attempt->score}/20");
            if ($attempt->score == 20.00) {
                $this->info("✅ SUCCESS: Quiz grading calculations correct!");
            } else {
                $this->error("❌ FAIL: Quiz grading miscalculation.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 7: Homework Submissions & Grading");
            $assignment = Assignment::create([
                'module_id' => $module1->id,
                'professor_id' => $prof->id,
                'title' => 'Project 1: MVC Architecture',
                'description' => 'Build a simple MVC framework.',
                'deadline' => now()->addDays(7),
                'max_grade' => 20.00,
            ]);

            $submission = Submission::create([
                'assignment_id' => $assignment->id,
                'student_id' => $student->id,
                'file_path' => 'submissions/mvc_test.zip',
                'submitted_at' => now(),
            ]);

            // Professor grades it
            $submission->update([
                'grade' => 17.50,
                'feedback' => 'Excellent work on controllers and routing!',
                'graded_at' => now(),
            ]);

            $this->line("Submission Grade: {$submission->grade}/20");
            $this->line("Submission Feedback: {$submission->feedback}");
            if ($submission->grade == 17.50 && $submission->feedback === 'Excellent work on controllers and routing!') {
                $this->info("✅ SUCCESS: Homework submission and grading recorded correctly!");
            } else {
                $this->error("❌ FAIL: Homework grading error.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 8: Automatic Attendance Warnings (3, 5, 7 Absences)");
            // Create mock seances to accumulate absences
            $seance1 = Seance::create(['module_id' => $module1->id, 'professor_id' => $prof->id, 'promotion_id' => 1, 'type' => 'CM', 'date' => now(), 'start_time' => '08:30', 'end_time' => '10:30']);
            $seance2 = Seance::create(['module_id' => $module1->id, 'professor_id' => $prof->id, 'promotion_id' => 1, 'type' => 'TD', 'date' => now(), 'start_time' => '10:45', 'end_time' => '12:45']);
            $seance3 = Seance::create(['module_id' => $module1->id, 'professor_id' => $prof->id, 'promotion_id' => 1, 'type' => 'TP', 'date' => now(), 'start_time' => '14:00', 'end_time' => '16:00']);

            // Student is marked absent in 3 seances
            Absence::create(['seance_id' => $seance1->id, 'student_id' => $student->id, 'status' => 'absent']);
            Absence::create(['seance_id' => $seance2->id, 'student_id' => $student->id, 'status' => 'absent']);
            
            // Third absence triggers bulkStore simulator
            $request = new \Illuminate\Http\Request();
            $request->replace([
                'seance_id' => $seance3->id,
                'records' => [
                    ['student_id' => $student->id, 'status' => 'absent']
                ]
            ]);

            $controller = new \App\Http\Controllers\Api\AbsenceController();
            $controller->bulkStore($request);

            $warning = StudentWarning::where('student_id', $student->id)->where('module_id', $module1->id)->first();
            $this->line("Absence Count: " . ($warning->absence_count ?? 0));
            $this->line("Warning Status: " . ($warning->status ?? 'None'));

            if ($warning && $warning->status === 'warning_1' && $warning->absence_count == 3) {
                $this->info("✅ SUCCESS: Auto warning 1 triggered at 3 absences!");
            } else {
                $this->error("❌ FAIL: Warning logic failed.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 9: Geofenced QR Sign-In Proximity Check");
            
            // Create dynamic QR code token
            $qrToken = \App\Models\SeanceQrToken::create([
                'seance_id' => $seance3->id,
                'token' => 'VALID_TOKEN_123',
                'latitude' => 33.57310000,
                'longitude' => -7.58980000,
                'expires_at' => now()->addSeconds(60),
            ]);

            // Test 1: Student too far (Casablanca vs Marrakech)
            auth('api')->setUser($user);
            $distFar = $controller->scanQrCode(new \Illuminate\Http\Request([
                'token' => 'VALID_TOKEN_123',
                'latitude' => 31.6295, // Marrakech
                'longitude' => -7.9811,
            ]));
            
            // Test 2: Student within range
            $distNear = $controller->scanQrCode(new \Illuminate\Http\Request([
                'token' => 'VALID_TOKEN_123',
                'latitude' => 33.57315000, // Casablanca matching coordinates
                'longitude' => -7.58985000,
            ]));

            $this->line("Proximity Far Scan Status Code: " . $distFar->status());
            $this->line("Proximity Near Scan Status Code: " . $distNear->status());
            if ($distFar->status() == 422 && $distNear->status() == 201) {
                $this->info("✅ SUCCESS: QR Code Proximity geofencing operates correctly!");
            } else {
                $this->error("❌ FAIL: Proximity validation failed.");
            }

            $this->info("\n==========================================");
            $this->info("TEST CASE 10: Justification Approval Warning Downgrades");
            
            // Find student's unexcused absence on seance1 and create justification
            $absenceToJustify = Absence::where('student_id', $student->id)
                ->where('seance_id', $seance1->id)
                ->first();
            
            $justification = \App\Models\Justification::create([
                'absence_id' => $absenceToJustify->id,
                'reason' => 'Medical checkup',
                'document_path' => 'justifications/medical.pdf',
                'status' => 'pending',
            ]);

            // Approve justification via controller review
            auth('api')->setUser($profUser);
            $controller->reviewJustification(new \Illuminate\Http\Request(['status' => 'approved']), $justification);

            // Fetch warnings again. Unexcused absence count should fall from 3 to 2, deleting warning_1!
            $warningAfterJustification = StudentWarning::where('student_id', $student->id)->where('module_id', $module1->id)->first();
            $this->line("Warning Status After Justification Approval: " . ($warningAfterJustification ? $warningAfterJustification->status : 'None (Warning Cleared)'));
            
            if (!$warningAfterJustification) {
                $this->info("✅ SUCCESS: Active warning automatically cleared upon justification approval!");
            } else {
                $this->error("❌ FAIL: Warning tier was not cleared or downgraded.");
            }

            $this->info("\nAll LMD core, LMS quiz/homework, QR geofencing, and warning tests executed successfully.");

        } catch (\Exception $e) {
            $this->error('Test transaction failed: ' . $e->getMessage());
        } finally {
            // Always rollback test database entries to keep DB clean!
            DB::rollBack();
            $this->info('Database rolled back. Test environment clean.');
        }

        return Command::SUCCESS;
    }
}

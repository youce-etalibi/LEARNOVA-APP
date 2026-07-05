<?php

namespace Database\Seeders;

use App\Models\Absence;
use App\Models\ChatConversation;
use App\Models\ChatParticipant;
use App\Models\Message;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Department;
use App\Models\Filiere;
use App\Models\Grade;
use App\Models\Lesson;
use App\Models\ManagementPedagogique;
use App\Models\Module;
use App\Models\Professor;
use App\Models\Promotion;
use App\Models\Room;
use App\Models\Seance;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $academicYear = '2025-2026';

        // ---------- Core role accounts ----------
        $superAdmin = $this->user('Super Admin', 'superadmin@learnova.test', 'SuperAdmin');
        $admin = $this->user('Admin User', 'admin@learnova.test', 'Admin');
        $mgmtUser = $this->user('Karim Pédagogie', 'management@learnova.test', 'ManagementPedagogique');

        // ---------- Departments ----------
        $csDept = Department::create(['name' => 'Informatique', 'code' => 'INFO', 'description' => 'Département Informatique']);
        $mathDept = Department::create(['name' => 'Mathématiques', 'code' => 'MATH', 'description' => 'Département Mathématiques']);

        ManagementPedagogique::create([
            'user_id' => $mgmtUser->id,
            'department_id' => $csDept->id,
            'role_title' => 'Responsable pédagogique',
        ]);

        // ---------- Professors ----------
        $profUser1 = $this->user('Prof. Amine Zidane', 'prof@learnova.test', 'Professor');
        $prof1 = Professor::create([
            'user_id' => $profUser1->id, 'employee_id' => 'EMP-1001',
            'department_id' => $csDept->id, 'grade' => 'PES', 'speciality' => 'Génie Logiciel',
        ]);

        $profUser2 = $this->user('Prof. Salma Bennani', 'prof2@learnova.test', 'Professor');
        $prof2 = Professor::create([
            'user_id' => $profUser2->id, 'employee_id' => 'EMP-1002',
            'department_id' => $mathDept->id, 'grade' => 'PH', 'speciality' => 'Algèbre',
        ]);

        $csDept->update(['head_id' => $profUser1->id]);

        // ---------- Filières & promotions ----------
        $filiere = Filiere::create([
            'name' => 'Génie Informatique', 'code' => 'GI', 'department_id' => $csDept->id,
            'level' => 'licence', 'duration_years' => 3,
        ]);

        $promotion = Promotion::create([
            'name' => 'GI - 2ème année', 'filiere_id' => $filiere->id,
            'academic_year' => $academicYear, 'max_students' => 60,
        ]);

        // ---------- Modules ----------
        $modules = collect([
            ['name' => 'Programmation Web', 'code' => 'GI-WEB', 'credits' => 6, 'semester' => 3, 'hours_total' => 60, 'hours_cm' => 20, 'hours_td' => 20, 'hours_tp' => 20],
            ['name' => 'Bases de Données', 'code' => 'GI-BDD', 'credits' => 5, 'semester' => 3, 'hours_total' => 45, 'hours_cm' => 20, 'hours_td' => 15, 'hours_tp' => 10],
            ['name' => 'Algèbre Linéaire', 'code' => 'GI-ALG', 'credits' => 4, 'semester' => 3, 'hours_total' => 40, 'hours_cm' => 24, 'hours_td' => 16, 'hours_tp' => 0],
        ])->map(fn ($m) => Module::create(array_merge($m, ['filiere_id' => $filiere->id])));

        $modules[0]->professors()->attach($prof1->id, ['academic_year' => $academicYear, 'type' => 'CM']);
        $modules[1]->professors()->attach($prof1->id, ['academic_year' => $academicYear, 'type' => 'CM']);
        $modules[2]->professors()->attach($prof2->id, ['academic_year' => $academicYear, 'type' => 'CM']);

        // ---------- Rooms ----------
        $amphi = Room::create(['name' => 'Amphi A', 'capacity' => 200, 'type' => 'amphi', 'building' => 'Bloc A']);
        $lab = Room::create(['name' => 'Lab Info 1', 'capacity' => 30, 'type' => 'lab', 'building' => 'Bloc B']);

        // ---------- Students ----------
        $students = collect();
        $studentNames = ['Youssef El Amrani', 'Fatima Zahra', 'Mehdi Ouali', 'Nadia Slaoui', 'Omar Tazi'];
        foreach ($studentNames as $i => $name) {
            $email = $i === 0 ? 'student@learnova.test' : 'student'.($i + 1).'@learnova.test';
            $u = $this->user($name, $email, 'Student');
            $students->push(Student::create([
                'user_id' => $u->id,
                'student_id' => 'CNE'.str_pad((string) ($i + 1), 6, '0', STR_PAD_LEFT),
                'promotion_id' => $promotion->id,
                'enrollment_year' => 2024,
                'status' => 'active',
            ]));
        }

        // ---------- Auto-formation learner ----------
        $this->user('Learner Libre', 'learner@learnova.test', 'AutoFormation');

        // ---------- Séances (sessions) ----------
        foreach (range(0, 9) as $d) {
            $date = now()->addDays($d - 2);
            $module = $modules[$d % 3];
            Seance::create([
                'module_id' => $module->id,
                'professor_id' => $module->professors()->first()->id,
                'promotion_id' => $promotion->id,
                'room_id' => $d % 2 ? $lab->id : $amphi->id,
                'type' => ['CM', 'TD', 'TP'][$d % 3],
                'date' => $date->toDateString(),
                'start_time' => sprintf('%02d:00', 8 + ($d % 4) * 2),
                'end_time' => sprintf('%02d:00', 10 + ($d % 4) * 2),
                'status' => $d < 2 ? 'done' : 'scheduled',
            ]);
        }

        // ---------- Grades ----------
        foreach ($students as $student) {
            foreach ($modules as $module) {
                foreach (['CC', 'Final'] as $type) {
                    Grade::create([
                        'student_id' => $student->id,
                        'module_id' => $module->id,
                        'professor_id' => $module->professors()->first()->id,
                        'academic_year' => $academicYear,
                        'semester' => 3,
                        'exam_type' => $type,
                        'grade' => rand(80, 180) / 10,
                        'coefficient' => $type === 'Final' ? 2 : 1,
                        'entered_at' => now(),
                    ]);
                }
            }
        }

        // ---------- Absences on a past (done) séance ----------
        $doneSeance = Seance::where('status', 'done')->first();
        foreach ($students as $i => $student) {
            Absence::create([
                'student_id' => $student->id,
                'seance_id' => $doneSeance->id,
                'status' => $i === 0 ? 'absent' : ($i === 1 ? 'late' : 'present'),
            ]);
        }

        // ---------- E-learning course ----------
        $course = Course::create([
            'module_id' => $modules[0]->id,
            'professor_id' => $prof1->id,
            'title' => 'Introduction à React & Laravel',
            'description' => 'Construisez une application full-stack moderne de A à Z.',
            'status' => 'published',
            'is_free' => true,
            'level' => 'beginner',
            'language' => 'fr',
        ]);

        $section1 = CourseSection::create(['course_id' => $course->id, 'title' => 'Démarrage', 'order_index' => 1, 'is_free_preview' => true]);
        $section2 = CourseSection::create(['course_id' => $course->id, 'title' => 'Aller plus loin', 'order_index' => 2]);

        Lesson::create(['section_id' => $section1->id, 'title' => 'Bienvenue', 'type' => 'video', 'content_url' => 'https://example.com/intro', 'duration_minutes' => 5, 'order_index' => 1]);
        Lesson::create(['section_id' => $section1->id, 'title' => 'Installer les outils', 'type' => 'text', 'content_text' => 'Node, PHP, Composer…', 'duration_minutes' => 10, 'order_index' => 2]);
        Lesson::create(['section_id' => $section2->id, 'title' => 'Les composants', 'type' => 'video', 'content_url' => 'https://example.com/components', 'duration_minutes' => 15, 'order_index' => 1]);

        // ---------- Quizzes ----------
        $lessonQuiz = Lesson::create([
            'section_id' => $section1->id,
            'title' => 'Évaluation React Fondamentaux',
            'type' => 'quiz',
            'duration_minutes' => 15,
            'order_index' => 3
        ]);

        $quiz = \App\Models\Quiz::create([
            'lesson_id' => $lessonQuiz->id,
            'module_id' => $modules[0]->id,
            'title' => 'Évaluation React Fondamentaux',
            'duration_minutes' => 15,
            'attempts_allowed' => 3,
            'passing_grade' => 10.00
        ]);

        // Quiz Questions & Options
        $q1 = \App\Models\QuizQuestion::create([
            'quiz_id' => $quiz->id,
            'question' => 'Quel hook React est utilisé pour gérer les effets de bord (side-effects) ?',
            'type' => 'mcq',
            'order_index' => 1,
            'points' => 10.00
        ]);
        $opt1_1 = \App\Models\QuizOption::create(['question_id' => $q1->id, 'label' => 'useState', 'is_correct' => false]);
        $opt1_2 = \App\Models\QuizOption::create(['question_id' => $q1->id, 'label' => 'useEffect', 'is_correct' => true]);
        $opt1_3 = \App\Models\QuizOption::create(['question_id' => $q1->id, 'label' => 'useContext', 'is_correct' => false]);
        $opt1_4 = \App\Models\QuizOption::create(['question_id' => $q1->id, 'label' => 'useReducer', 'is_correct' => false]);

        $q2 = \App\Models\QuizQuestion::create([
            'quiz_id' => $quiz->id,
            'question' => 'Comment déclare-t-on un état réactif dans un composant fonctionnel ?',
            'type' => 'mcq',
            'order_index' => 2,
            'points' => 10.00
        ]);
        $opt2_1 = \App\Models\QuizOption::create(['question_id' => $q2->id, 'label' => 'const [state, setState] = useState(init)', 'is_correct' => true]);
        $opt2_2 = \App\Models\QuizOption::create(['question_id' => $q2->id, 'label' => 'let state = init', 'is_correct' => false]);
        $opt2_3 = \App\Models\QuizOption::create(['question_id' => $q2->id, 'label' => 'const state = new React.State(init)', 'is_correct' => false]);

        // Shared Question Bank Entries
        \App\Models\QuestionBank::create([
            'professor_id' => $prof1->id,
            'question_text' => 'Que signifie CSR en développement web moderne ?',
            'type' => 'mcq',
            'points' => 5.00,
            'explanation' => 'CSR signifie Client-Side Rendering, où le rendu de la page est effectué par le navigateur en utilisant JavaScript.',
            'category' => 'Général',
            'options_json' => [
                ['label' => 'Client-Side Rendering', 'is_correct' => true],
                ['label' => 'Common Style Sheets', 'is_correct' => false],
                ['label' => 'Compiled System Repository', 'is_correct' => false],
            ]
        ]);

        // Student Quiz Attempts
        $attempt1 = \App\Models\QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $students[0]->user_id,
            'score' => 20.00,
            'started_at' => now()->subHours(2),
            'finished_at' => now()->subHours(2)->addMinutes(11),
            'infractions_count' => 0
        ]);
        \App\Models\QuizAnswer::create(['attempt_id' => $attempt1->id, 'question_id' => $q1->id, 'option_id' => $opt1_2->id, 'is_correct' => true]);
        \App\Models\QuizAnswer::create(['attempt_id' => $attempt1->id, 'question_id' => $q2->id, 'option_id' => $opt2_1->id, 'is_correct' => true]);

        $attempt2 = \App\Models\QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $students[1]->user_id,
            'score' => 10.00,
            'started_at' => now()->subHours(1),
            'finished_at' => now()->subHours(1)->addMinutes(14),
            'infractions_count' => 1
        ]);
        \App\Models\QuizAnswer::create(['attempt_id' => $attempt2->id, 'question_id' => $q1->id, 'option_id' => $opt1_1->id, 'is_correct' => false]);
        \App\Models\QuizAnswer::create(['attempt_id' => $attempt2->id, 'question_id' => $q2->id, 'option_id' => $opt2_1->id, 'is_correct' => true]);

        $attempt3 = \App\Models\QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $students[2]->user_id,
            'score' => 0.00,
            'started_at' => now()->subMinutes(30),
            'finished_at' => now()->subMinutes(18),
            'infractions_count' => 3
        ]);
        \App\Models\QuizAnswer::create(['attempt_id' => $attempt3->id, 'question_id' => $q1->id, 'option_id' => $opt1_3->id, 'is_correct' => false]);
        \App\Models\QuizAnswer::create(['attempt_id' => $attempt3->id, 'question_id' => $q2->id, 'option_id' => $opt2_2->id, 'is_correct' => false]);


        // ---------- Assignments & Homework ----------
        $assignment = \App\Models\Assignment::create([
            'module_id' => $modules[0]->id,
            'professor_id' => $prof1->id,
            'title' => 'Mini-projet React Hooks & Axios',
            'description' => 'Réaliser une interface de consommation API de météo avec gestion des favoris.',
            'deadline' => now()->addDays(7),
            'max_grade' => 20.00,
            'type' => 'individual'
        ]);

        $assignment2 = \App\Models\Assignment::create([
            'module_id' => $modules[0]->id,
            'professor_id' => $prof1->id,
            'title' => 'Devoir 2 - Laravel API RESTful',
            'description' => 'Créer un backend RESTful sécurisé avec authentification Sanctum.',
            'deadline' => now()->addDays(14),
            'max_grade' => 20.00,
            'type' => 'individual'
        ]);

        // Student submissions
        \App\Models\Submission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $students[0]->id,
            'file_path' => 'submissions/youssef_web_react.zip',
            'submitted_at' => now()->subDays(2),
            'grade' => 17.50,
            'feedback' => 'Très bonne structure, code propre et respect des hooks personnalisés.',
            'graded_at' => now()->subDays(1),
        ]);

        \App\Models\Submission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $students[1]->id,
            'file_path' => 'submissions/fatima_web_react.zip',
            'submitted_at' => now()->subDays(1),
            'grade' => 13.00,
            'feedback' => 'Bon travail, mais quelques petits bugs de responsive design à corriger.',
            'graded_at' => now(),
        ]);

        \App\Models\Submission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $students[2]->id,
            'file_path' => 'submissions/mehdi_web_react.zip',
            'submitted_at' => now(),
            'grade' => null,
            'feedback' => null,
            'graded_at' => null,
        ]);

        \App\Models\Submission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $students[4]->id,
            'file_path' => 'submissions/omar_web_react.zip',
            'submitted_at' => now()->subHours(5),
            'grade' => null,
            'feedback' => null,
            'graded_at' => null,
        ]);


        // ---------- Absences & Warnings ----------
        foreach (range(1, 4) as $sIdx) {
            $hSeance = Seance::create([
                'module_id' => $modules[0]->id,
                'professor_id' => $prof1->id,
                'promotion_id' => $promotion->id,
                'room_id' => $lab->id,
                'type' => 'TD',
                'date' => now()->subWeeks($sIdx)->toDateString(),
                'start_time' => '10:00',
                'end_time' => '12:00',
                'status' => 'done',
            ]);
            
            foreach ($students as $student) {
                Absence::create([
                    'student_id' => $student->id,
                    'seance_id' => $hSeance->id,
                    'status' => $student->id === $students[3]->id ? 'absent' : 'present',
                ]);
            }
        }

        \App\Models\StudentWarning::create([
            'student_id' => $students[3]->id,
            'module_id' => $modules[0]->id,
            'absence_count' => 4,
            'status' => 'warning_1',
        ]);


        // ---------- PFE Projects ----------
        \App\Models\PfeProject::create([
            'student_id' => $students[0]->id,
            'professor_id' => $prof1->id,
            'title' => 'LMS intelligent basé sur l\'IA agentique',
            'description' => 'Développement d\'une plateforme éducative moderne intégrant des bots d\'aide à la révision.',
            'company_name' => 'TechSolutions Maroc',
            'supervisor_name' => 'M. Slimani',
            'status' => 'in_progress',
        ]);

        \App\Models\PfeProject::create([
            'student_id' => $students[1]->id,
            'professor_id' => $prof2->id,
            'title' => 'Optimisation des plannings par algorithmes génétiques',
            'description' => 'Résolution automatique des conflits de salles et d\'emploi du temps.',
            'company_name' => 'E-Innovations',
            'supervisor_name' => 'Mme. Benjelloun',
            'status' => 'validated',
            'grade' => 16.50,
            'defense_date' => now()->subDays(5),
        ]);


        // ---------- Tuition Billing & Payments ----------
        $inv1 = \App\Models\TuitionInvoice::create([
            'student_id' => $students[0]->id,
            'academic_year' => $academicYear,
            'semester' => 3,
            'amount' => 5000.00,
            'amount_paid' => 5000.00,
            'status' => 'paid',
            'due_date' => now()->subDays(30),
        ]);

        $pay1 = \App\Models\Payment::create([
            'user_id' => $students[0]->user_id,
            'amount' => 5000.00,
            'currency' => 'MAD',
            'status' => 'completed',
            'payment_method' => 'card',
            'transaction_ref' => 'TXN-' . Str::upper(Str::random(10)),
            'paid_at' => now()->subDays(30),
        ]);

        \App\Models\InvoicePayment::create([
            'invoice_id' => $inv1->id,
            'payment_id' => $pay1->id,
            'amount_allocated' => 5000.00,
        ]);

        \App\Models\TuitionInvoice::create([
            'student_id' => $students[1]->id,
            'academic_year' => $academicYear,
            'semester' => 3,
            'amount' => 5000.00,
            'amount_paid' => 0.00,
            'status' => 'unpaid',
            'due_date' => now()->addDays(15),
        ]);

        // ---------- Announcements ----------
        Announcement::create([
            'author_id' => $admin->id,
            'title' => 'Bienvenue sur Learnova 🎓',
            'content' => 'La plateforme est maintenant ouverte. Consultez votre emploi du temps et vos cours.',
            'target_type' => 'all',
            'pinned' => true,
            'published_at' => now(),
        ]);
        Announcement::create([
            'author_id' => $profUser1->id,
            'title' => 'Examen de Programmation Web',
            'content' => 'L\'examen final aura lieu la semaine prochaine. Révisez les chapitres 1 à 5.',
            'target_type' => 'promotion',
            'target_id' => $promotion->id,
            'published_at' => now(),
        ]);

        // ---------- Chat Conversations & Messages ----------
        // 1. Direct chat between Youssef (Student 1) and Karim (Management)
        $directConv = ChatConversation::create([
            'type' => 'direct',
            'creator_id' => $students[0]->user_id,
        ]);

        ChatParticipant::create([
            'conversation_id' => $directConv->id,
            'user_id' => $students[0]->user_id,
            'last_read_at' => now(),
        ]);

        ChatParticipant::create([
            'conversation_id' => $directConv->id,
            'user_id' => $mgmtUser->id,
            'last_read_at' => now()->subMinutes(10),
        ]);

        Message::create([
            'conversation_id' => $directConv->id,
            'sender_id' => $students[0]->user_id,
            'content' => "Bonjour M. Karim, comment puis-je justifier mon absence du lundi dernier ?",
            'created_at' => now()->subMinutes(30),
        ]);

        Message::create([
            'conversation_id' => $directConv->id,
            'sender_id' => $mgmtUser->id,
            'content' => "Bonjour Youssef. Déposez votre certificat médical ou justificatif directement sur l'onglet 'Mes absences' en format PDF.",
            'created_at' => now()->subMinutes(15),
        ]);

        Message::create([
            'conversation_id' => $directConv->id,
            'sender_id' => $students[0]->user_id,
            'content' => "C'est fait, merci beaucoup !",
            'created_at' => now()->subMinutes(5),
        ]);

        // 2. Class Group Chat created by Prof Zidane (for GI - 2ème année)
        $groupConv = ChatConversation::create([
            'type' => 'group',
            'name' => 'GI - 2ème année (Général)',
            'creator_id' => $profUser1->id,
            'promotion_id' => $promotion->id,
            'read_only_for_students' => false,
        ]);

        // Add Zidane
        ChatParticipant::create([
            'conversation_id' => $groupConv->id,
            'user_id' => $profUser1->id,
            'last_read_at' => now(),
        ]);

        // Add all students
        foreach ($students as $student) {
            ChatParticipant::create([
                'conversation_id' => $groupConv->id,
                'user_id' => $student->user_id,
                'last_read_at' => now()->subHours(1),
            ]);
        }

        Message::create([
            'conversation_id' => $groupConv->id,
            'sender_id' => $profUser1->id,
            'content' => "📢 Groupe créé par Prof. Amine Zidane. Ce canal servira pour discuter du cours de Programmation Web.",
            'created_at' => now()->subHours(5),
        ]);

        Message::create([
            'conversation_id' => $groupConv->id,
            'sender_id' => $profUser1->id,
            'content' => "N'oubliez pas de soumettre votre mini-projet React avant la fin de la semaine prochaine !",
            'created_at' => now()->subHours(4),
        ]);

        Message::create([
            'conversation_id' => $groupConv->id,
            'sender_id' => $students[0]->user_id,
            'content' => "Entendu Monsieur, merci !",
            'created_at' => now()->subHours(3),
        ]);

        $this->command->info('Demo data seeded. Login with any *@learnova.test account, password: password');
    }

    private function user(string $name, string $email, string $role): User
    {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => 'password',
                'status' => 'active',
                'email_verified_at' => now(),
                'phone' => '06'.rand(10000000, 99999999),
                'bio' => Str::limit('Compte de démonstration Learnova pour le rôle '.$role, 120),
            ],
        );

        $user->syncRoles([$role]);

        return $user;
    }
}

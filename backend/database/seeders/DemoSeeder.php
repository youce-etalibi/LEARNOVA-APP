<?php

namespace Database\Seeders;

use App\Models\Absence;
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

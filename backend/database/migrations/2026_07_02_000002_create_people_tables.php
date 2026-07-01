<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('employee_id')->unique();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->enum('grade', ['assistant', 'PH', 'PES'])->default('assistant');
            $table->string('speciality')->nullable();
            $table->timestamps();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('student_id')->unique(); // CNE
            $table->foreignId('promotion_id')->nullable()->constrained('promotions')->nullOnDelete();
            $table->year('enrollment_year')->nullable();
            $table->enum('status', ['active', 'suspended', 'graduated'])->default('active');
            $table->timestamps();
        });

        Schema::create('management_pedagogique', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('role_title')->nullable();
            $table->timestamps();
        });

        // Pivot: which professor teaches which module
        Schema::create('professor_module', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professor_id')->constrained('professors')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->string('academic_year');
            $table->enum('type', ['CM', 'TD', 'TP'])->default('CM');
            $table->timestamps();
            $table->unique(['professor_id', 'module_id', 'academic_year', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professor_module');
        Schema::dropIfExists('management_pedagogique');
        Schema::dropIfExists('students');
        Schema::dropIfExists('professors');
    }
};

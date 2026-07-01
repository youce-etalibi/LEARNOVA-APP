<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->foreignId('professor_id')->nullable()->constrained('professors')->nullOnDelete();
            $table->string('academic_year');
            $table->unsignedTinyInteger('semester')->default(1);
            $table->enum('exam_type', ['CC', 'TP', 'Final', 'Rattrapage'])->default('CC');
            $table->decimal('grade', 5, 2); // 0-20
            $table->decimal('coefficient', 4, 2)->default(1);
            $table->text('comment')->nullable();
            $table->timestamp('entered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('absences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('seance_id')->constrained('seances')->cascadeOnDelete();
            $table->enum('status', ['absent', 'present', 'justified', 'late'])->default('absent');
            $table->text('justification')->nullable();
            $table->foreignId('justified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('justified_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'seance_id']);
        });

        Schema::create('justifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('absence_id')->constrained('absences')->cascadeOnDelete();
            $table->string('document_path')->nullable();
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('justifications');
        Schema::dropIfExists('absences');
        Schema::dropIfExists('grades');
    }
};

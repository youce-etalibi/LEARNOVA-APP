<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_module_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->string('academic_year', 20);
            $table->unsignedTinyInteger('semester');
            $table->decimal('raw_average', 5, 2);
            $table->decimal('ratt_average', 5, 2)->nullable();
            $table->decimal('final_score', 5, 2);
            $table->enum('status', ['V', 'VC', 'RAT', 'ELIM'])->default('RAT');
            $table->boolean('is_locked')->default(false);
            $table->timestamps();

            $table->unique(['student_id', 'module_id', 'academic_year'], 'stud_mod_yr_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_module_statuses');
    }
};

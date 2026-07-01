<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pfe_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->unique()->constrained('students')->cascadeOnDelete();
            $table->foreignId('professor_id')->constrained('professors')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('company_name')->nullable();
            $table->string('supervisor_name')->nullable();
            $table->enum('status', ['proposed', 'in_progress', 'submitted', 'validated', 'rejected'])->default('proposed');
            $table->decimal('grade', 4, 2)->nullable(); // 0.00 to 20.00
            $table->dateTime('defense_date')->nullable();
            $table->timestamps();

            $table->index('student_id');
            $table->index('professor_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pfe_projects');
    }
};

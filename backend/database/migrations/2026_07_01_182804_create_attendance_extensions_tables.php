<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seance_qr_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seance_id')->constrained('seances')->cascadeOnDelete();
            $table->string('token')->unique();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        Schema::create('student_warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->unsignedTinyInteger('absence_count');
            $table->enum('status', ['warning_1', 'warning_2', 'excluded'])->default('warning_1');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_warnings');
        Schema::dropIfExists('seance_qr_tokens');
    }
};

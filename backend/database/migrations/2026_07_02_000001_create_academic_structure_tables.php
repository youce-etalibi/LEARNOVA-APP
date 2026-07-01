<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('head_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('filieres', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->enum('level', ['licence', 'master', 'doctorat'])->default('licence');
            $table->unsignedTinyInteger('duration_years')->default(3);
            $table->timestamps();
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('filiere_id')->constrained('filieres')->cascadeOnDelete();
            $table->string('academic_year'); // e.g. 2025-2026
            $table->unsignedSmallInteger('max_students')->default(60);
            $table->timestamps();
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->unsignedTinyInteger('credits')->default(0);
            $table->unsignedSmallInteger('hours_total')->default(0);
            $table->unsignedSmallInteger('hours_cm')->default(0);
            $table->unsignedSmallInteger('hours_td')->default(0);
            $table->unsignedSmallInteger('hours_tp')->default(0);
            $table->foreignId('filiere_id')->constrained('filieres')->cascadeOnDelete();
            $table->unsignedTinyInteger('semester')->default(1);
            $table->timestamps();
        });

        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedSmallInteger('capacity')->default(30);
            $table->enum('type', ['classroom', 'amphi', 'lab', 'online'])->default('classroom');
            $table->string('building')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('filieres');
        Schema::dropIfExists('departments');
    }
};

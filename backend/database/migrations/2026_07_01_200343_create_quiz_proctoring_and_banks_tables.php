<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Check if question_banks already exists to prevent duplicate error
        if (!Schema::hasTable('question_banks')) {
            Schema::create('question_banks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('professor_id')->constrained('professors')->cascadeOnDelete();
                $table->string('category');
                $table->text('question_text');
                $table->enum('type', ['mcq', 'true_false', 'short'])->default('mcq');
                $table->decimal('points', 5, 2)->default(5);
                $table->text('explanation')->nullable();
                $table->json('options_json');
                $table->timestamps();
            });
        }

        // Add explanation column to quiz_questions if not present
        if (!Schema::hasColumn('quiz_questions', 'explanation')) {
            Schema::table('quiz_questions', function (Blueprint $table) {
                $table->text('explanation')->nullable();
            });
        }

        // Add infractions_count to quiz_attempts if not present
        if (!Schema::hasColumn('quiz_attempts', 'infractions_count')) {
            Schema::table('quiz_attempts', function (Blueprint $table) {
                $table->unsignedInteger('infractions_count')->default(0);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('quiz_attempts', 'infractions_count')) {
            Schema::table('quiz_attempts', function (Blueprint $table) {
                $table->dropColumn('infractions_count');
            });
        }

        if (Schema::hasColumn('quiz_questions', 'explanation')) {
            Schema::table('quiz_questions', function (Blueprint $table) {
                $table->dropColumn('explanation');
            });
        }

        Schema::dropIfExists('question_banks');
    }
};

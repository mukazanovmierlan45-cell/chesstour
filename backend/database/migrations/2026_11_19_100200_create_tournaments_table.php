<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            // Организатор: удалить пользователя, у которого есть турниры, нельзя
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            // Справочник: используемый контроль времени удалить нельзя
            $table->foreignId('time_control_id')->constrained()->restrictOnDelete();
            $table->string('title')->index();
            $table->text('description')->nullable();
            $table->string('format', 20);
            $table->string('location');
            $table->date('start_date')->index();
            $table->date('end_date');
            $table->dateTime('registration_deadline');
            $table->unsignedSmallInteger('max_participants');
            $table->unsignedTinyInteger('rounds_count');
            $table->unsignedSmallInteger('min_rating')->nullable();
            $table->string('poster_path')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};

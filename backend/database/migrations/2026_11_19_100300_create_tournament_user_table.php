<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Промежуточная таблица связи «многие ко многим» users <-> tournaments.
     */
    public function up(): void
    {
        Schema::create('tournament_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('start_number')->nullable();
            $table->unsignedSmallInteger('rating_at_start');
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->unique(['tournament_id', 'user_id']);
            $table->unique(['tournament_id', 'start_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_user');
    }
};

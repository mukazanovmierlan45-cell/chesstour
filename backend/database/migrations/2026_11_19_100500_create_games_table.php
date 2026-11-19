<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained()->cascadeOnDelete();
            // Сыгранные партии — история турнира, поэтому RESTRICT
            $table->foreignId('white_player_id')->constrained('users')->restrictOnDelete();
            // NULL = игрок без пары (bye). SET NULL не подходит: превратил бы партию в bye
            $table->foreignId('black_player_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->unsignedSmallInteger('board_number');
            $table->string('result', 20)->default('pending')->index();
            $table->text('pgn')->nullable();
            $table->timestamps();

            $table->unique(['round_id', 'board_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};

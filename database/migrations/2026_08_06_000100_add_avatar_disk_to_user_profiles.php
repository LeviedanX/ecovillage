<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table): void {
            // Disk disimpan bersama path agar berkas lama tetap terhapus
            // dengan benar ketika konfigurasi penyimpanan berubah.
            $table->string('avatar_disk', 30)->nullable()->after('avatar_path');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table): void {
            $table->dropColumn('avatar_disk');
        });
    }
};

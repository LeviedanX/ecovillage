<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table): void {
            $table->id();
            $table->string('disk', 30)->default('public');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->string('alt_text')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['disk', 'path']);
        });

        Schema::create('page_contents', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('eyebrow');
            $table->string('title', 500);
            $table->text('lead');
            $table->string('icon', 60)->default('Leaf');
            // Sections berbentuk list agar urutan, jumlah, dan bullet dapat
            // diubah tanpa migrasi lanjutan.
            $table->json('sections');
            $table->string('hero_image_disk', 30)->nullable();
            $table->string('hero_image_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_contents');
        Schema::dropIfExists('media_assets');
    }
};

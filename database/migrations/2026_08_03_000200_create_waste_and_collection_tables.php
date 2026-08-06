<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waste_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_hazardous')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('waste_types', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('waste_category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('unit', 20)->default('kg');
            $table->text('description')->nullable();
            $table->text('handling_notes')->nullable();
            $table->string('image_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['waste_category_id', 'is_active']);
        });

        Schema::create('collection_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('requester_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('region_id')->constrained()->restrictOnDelete();
            $table->foreignId('address_id')->nullable()->constrained()->nullOnDelete();
            $table->string('request_number', 40)->unique();
            $table->json('address_snapshot');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('location_consent_at')->nullable();
            $table->string('method', 20);
            $table->string('status', 20);
            $table->boolean('contains_hazardous')->default(false);
            $table->string('hazardous_handling_status', 40)->nullable();
            $table->json('hazardous_partner_snapshot')->nullable();
            $table->timestamp('desired_at')->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();
            $table->index(['requester_id', 'status']);
            $table->index(['region_id', 'status', 'desired_at']);
            $table->index(['contains_hazardous', 'hazardous_handling_status'], 'collection_requests_hazardous_index');
            $table->index(['latitude', 'longitude']);
        });

        Schema::create('collection_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('collection_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('waste_type_id')->constrained()->restrictOnDelete();
            $table->decimal('estimated_weight', 12, 3);
            $table->decimal('verified_weight', 12, 3)->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['collection_request_id', 'waste_type_id']);
        });

        Schema::create('collection_photos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('collection_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('kind', 30)->default('request');
            $table->string('disk', 30)->default('local');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
            $table->index(['collection_request_id', 'kind']);
        });

        Schema::create('collection_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('collection_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assignee_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('assigned_at');
            $table->timestamp('completed_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['collection_request_id', 'assignee_id', 'assigned_at'], 'collection_assignment_unique');
            $table->index(['assignee_id', 'is_active', 'assigned_at']);
        });

        Schema::create('collection_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('collection_request_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['collection_request_id', 'created_at'], 'collection_status_histories_request_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_status_histories');
        Schema::dropIfExists('collection_assignments');
        Schema::dropIfExists('collection_photos');
        Schema::dropIfExists('collection_items');
        Schema::dropIfExists('collection_requests');
        Schema::dropIfExists('waste_types');
        Schema::dropIfExists('waste_categories');
    }
};

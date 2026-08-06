<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('point_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('waste_type_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->decimal('points_per_kg', 12, 4);
            $table->timestamp('effective_from');
            $table->timestamp('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['waste_type_id', 'version']);
            $table->index(['waste_type_id', 'is_active', 'effective_from']);
        });

        Schema::create('environmental_factor_sets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('version');
            $table->string('source_name');
            $table->string('source_url')->nullable();
            $table->timestamp('effective_from')->nullable();
            $table->timestamp('effective_to')->nullable();
            $table->text('methodology_notes')->nullable();
            $table->text('scope_notes')->nullable();
            $table->string('status', 20);
            $table->boolean('is_demo')->default(false);
            $table->timestamps();
            $table->unique(['name', 'version']);
            $table->index(['status', 'effective_from', 'effective_to'], 'environmental_factor_sets_effective_index');
            $table->index(['region_id', 'status', 'effective_from']);
        });

        Schema::create('environmental_factors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('environmental_factor_set_id')->constrained()->cascadeOnDelete();
            $table->foreignId('waste_type_id')->constrained()->restrictOnDelete();
            $table->string('impact_kind', 50);
            $table->decimal('factor_value', 18, 8);
            $table->string('unit', 50);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(
                ['environmental_factor_set_id', 'waste_type_id', 'impact_kind'],
                'environmental_factor_unique',
            );
        });

        Schema::create('impact_calculations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('collection_request_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('environmental_factor_set_id')->constrained()->restrictOnDelete();
            $table->decimal('total_verified_weight', 14, 3);
            $table->decimal('total_carbon_kg_co2e', 18, 6)->default(0);
            $table->decimal('total_recyclable_kg', 18, 6)->default(0);
            $table->decimal('total_energy_kwh', 18, 6)->default(0);
            $table->json('methodology_snapshot');
            $table->timestamp('calculated_at');
            $table->timestamps();
        });

        Schema::create('impact_calculation_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('impact_calculation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('collection_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('waste_type_id')->constrained()->restrictOnDelete();
            $table->decimal('verified_weight', 12, 3);
            $table->decimal('carbon_kg_co2e', 18, 6)->default(0);
            $table->decimal('recyclable_kg', 18, 6)->default(0);
            $table->decimal('energy_kwh', 18, 6)->default(0);
            $table->json('factor_snapshot');
            $table->timestamps();
            $table->unique(['impact_calculation_id', 'collection_item_id'], 'impact_item_unique');
        });

        Schema::create('point_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('balance')->default(0);
            $table->timestamps();
        });

        Schema::create('point_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('point_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('type', 20);
            $table->bigInteger('amount');
            $table->unsignedBigInteger('balance_before');
            $table->unsignedBigInteger('balance_after');
            $table->nullableMorphs('reference');
            $table->string('idempotency_key', 120)->unique();
            $table->text('reason')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['user_id', 'occurred_at']);
            $table->index(['point_account_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_transactions');
        Schema::dropIfExists('point_accounts');
        Schema::dropIfExists('impact_calculation_items');
        Schema::dropIfExists('impact_calculations');
        Schema::dropIfExists('environmental_factors');
        Schema::dropIfExists('environmental_factor_sets');
        Schema::dropIfExists('point_rules');
    }
};

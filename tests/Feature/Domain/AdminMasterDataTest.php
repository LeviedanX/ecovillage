<?php

namespace Tests\Feature\Domain;

use App\Enums\ContentStatus;
use App\Enums\FactorSetStatus;
use App\Enums\ProgramStatus;
use App\Enums\ProgramType;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EnvironmentalFactor;
use App\Models\EnvironmentalFactorSet;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Program;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WasteCategory;
use App\Models\WasteType;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminMasterDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_cannot_open_or_mutate_master_data(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $citizen = User::factory()->create();
        $citizen->assignRole(RoleName::Citizen->value);

        $this->actingAs($citizen)
            ->get(route('admin.master-data.index'))
            ->assertForbidden();
        $this->actingAs($citizen)
            ->post(route('admin.master-data.waste-categories.store'), [
                'name' => 'Tidak sah',
                'slug' => 'tidak-sah',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('waste_categories', 0);
    }

    public function test_manager_index_and_mutations_are_scoped_to_assigned_region(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $regionA = $this->region('A');
        $regionB = $this->region('B');
        $manager = $this->manager($regionA);
        $category = EducationCategory::query()->create(['name' => 'Edukasi Wilayah', 'slug' => 'edukasi-wilayah']);
        $contentA = $this->education($category, $manager, $regionA, 'Materi Wilayah A');
        $this->education($category, $manager, $regionB, 'Materi Rahasia B');
        $programA = $this->program($manager, $regionA, 'Program Wilayah A');
        $programB = $this->program($manager, $regionB, 'Program Rahasia B');
        $productCategory = ProductCategory::query()->create(['name' => 'Produk Wilayah', 'slug' => 'produk-wilayah']);
        $productA = $this->product($productCategory, $programA, 'Produk Wilayah A');
        $productB = $this->product($productCategory, $programB, 'Produk Rahasia B');

        $this->actingAs($manager)
            ->get(route('admin.master-data.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/master-data')
                ->where('abilities.educationManage', true)
                ->where('abilities.regionsManage', false)
                ->has('educationContents', 1)
                ->where('educationContents.0.id', $contentA->id)
                ->has('programs', 1)
                ->where('programs.0.id', $programA->id)
                ->has('products', 1)
                ->where('products.0.id', $productA->id));

        $this->actingAs($manager)
            ->patch(route('admin.master-data.programs.update', $programB), $this->programPayload($manager, $regionB, 'Program Rahasia Diubah'))
            ->assertForbidden();
        $this->actingAs($manager)
            ->post(route('admin.master-data.inventory.adjust'), [
                'product_id' => $productB->id,
                'quantity' => 1,
                'reason' => 'Percobaan stok lintas wilayah harus ditolak.',
            ])
            ->assertForbidden();

        $this->assertSame('Program Rahasia B', $programB->fresh()->title);
        $this->assertSame(2, $productB->fresh()->stock);
    }

    public function test_super_admin_can_version_factors_but_cannot_mutate_an_active_set(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);
        $region = $this->region('FACTOR');
        $category = WasteCategory::query()->create(['name' => 'Organik Faktor Admin', 'slug' => 'organik-faktor-admin']);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Daun Faktor Admin',
            'slug' => 'daun-faktor-admin',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.master-data.point-rules.store'), [
                'waste_type_id' => $wasteType->id,
                'version' => 1,
                'points_per_kg' => '2.5000',
                'effective_from' => now()->subDay()->toDateTimeString(),
                'is_active' => true,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->actingAs($admin)
            ->post(route('admin.master-data.factor-sets.store'), $this->factorSetPayload($region, FactorSetStatus::Draft))
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $set = EnvironmentalFactorSet::query()->sole();

        foreach ([
            EnvironmentalFactor::CARBON => ['0.10000000', 'kg CO2e/kg'],
            EnvironmentalFactor::RECYCLABLE => ['0.20000000', 'kg/kg'],
            EnvironmentalFactor::ENERGY => ['0.30000000', 'kWh/kg'],
        ] as $kind => [$value, $unit]) {
            $this->actingAs($admin)
                ->post(route('admin.master-data.environmental-factors.store'), [
                    'environmental_factor_set_id' => $set->id,
                    'waste_type_id' => $wasteType->id,
                    'impact_kind' => $kind,
                    'factor_value' => $value,
                    'unit' => $unit,
                    'notes' => 'Nilai sintetis hanya untuk pengujian perangkat lunak.',
                ])
                ->assertRedirect()
                ->assertSessionHasNoErrors();
        }

        $this->actingAs($admin)
            ->patch(route('admin.master-data.factor-sets.update', $set), $this->factorSetPayload($region, FactorSetStatus::Active))
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(FactorSetStatus::Active, $set->fresh()->status);

        $factor = $set->factors()->firstOrFail();
        $this->actingAs($admin)
            ->patch(route('admin.master-data.environmental-factors.update', $factor), [
                'environmental_factor_set_id' => $set->id,
                'waste_type_id' => $wasteType->id,
                'impact_kind' => $factor->impact_kind,
                'factor_value' => '9.00000000',
                'unit' => $factor->unit,
            ])
            ->assertSessionHasErrors('factor_set');
        $this->assertNotSame('9.00000000', $factor->fresh()->factor_value);
    }

    public function test_product_stock_is_changed_only_through_inventory_movements(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);
        $category = ProductCategory::query()->create(['name' => 'Produk Stok', 'slug' => 'produk-stok']);

        $this->actingAs($admin)
            ->post(route('admin.master-data.products.store'), [
                'product_category_id' => $category->id,
                'name' => 'Kompos Stok',
                'slug' => 'kompos-stok',
                'description' => 'Produk sintetis untuk pengujian stok.',
                'point_price' => 100,
                'initial_stock' => 3,
                'is_active' => true,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $product = Product::query()->sole();
        $this->assertSame(3, $product->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'quantity' => 3,
            'stock_before' => 0,
            'stock_after' => 3,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.master-data.inventory.adjust'), [
                'product_id' => $product->id,
                'quantity' => -4,
                'reason' => 'Penyesuaian negatif melebihi stok tersedia.',
            ])
            ->assertSessionHasErrors('quantity');
        $this->assertSame(3, $product->fresh()->stock);

        $this->actingAs($admin)
            ->post(route('admin.master-data.inventory.adjust'), [
                'product_id' => $product->id,
                'quantity' => 2,
                'reason' => 'Restock sintetis untuk pengujian inventori.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame(2, $product->inventoryMovements()->count());
    }

    private function region(string $suffix): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => "RW-MASTER-{$suffix}",
            'name' => "RW Master {$suffix}",
            'slug' => strtolower("rw-master-{$suffix}"),
        ]);
    }

    private function manager(Region $region): User
    {
        $manager = User::factory()->create(['name' => 'Pengelola Master A']);
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $region->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $region->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);

        return $manager;
    }

    private function education(EducationCategory $category, User $author, Region $region, string $title): EducationContent
    {
        return EducationContent::query()->create([
            'education_category_id' => $category->id,
            'author_id' => $author->id,
            'region_id' => $region->id,
            'title' => $title,
            'slug' => strtolower(str_replace(' ', '-', $title)),
            'body' => 'Materi sintetis cukup panjang untuk pengujian isolasi konten edukasi antarwilayah.',
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);
    }

    private function program(User $manager, Region $region, string $title): Program
    {
        return Program::query()->create([
            ...$this->programPayload($manager, $region, $title),
            'slug' => strtolower(str_replace(' ', '-', $title)),
        ]);
    }

    /** @return array<string, mixed> */
    private function programPayload(User $manager, Region $region, string $title): array
    {
        return [
            'region_id' => $region->id,
            'manager_id' => $manager->id,
            'type' => ProgramType::EcoPore->value,
            'title' => $title,
            'slug' => strtolower(str_replace(' ', '-', $title)),
            'description' => 'Program sintetis yang cukup panjang untuk pengujian isolasi data wilayah.',
            'status' => ProgramStatus::Published->value,
        ];
    }

    private function product(ProductCategory $category, Program $program, string $name): Product
    {
        return Product::query()->create([
            'product_category_id' => $category->id,
            'program_id' => $program->id,
            'name' => $name,
            'slug' => strtolower(str_replace(' ', '-', $name)),
            'point_price' => 100,
            'stock' => 2,
            'is_active' => true,
        ]);
    }

    /** @return array<string, mixed> */
    private function factorSetPayload(Region $region, FactorSetStatus $status): array
    {
        return [
            'region_id' => $region->id,
            'name' => 'Factor Set Admin Sintetis',
            'version' => 1,
            'source_name' => 'Sumber sintetis pengujian admin',
            'effective_from' => now()->subDay()->toDateTimeString(),
            'methodology_notes' => 'Metodologi sintetis ini hanya digunakan untuk menguji governance versi factor set.',
            'scope_notes' => 'Cakupan sintetis khusus wilayah pengujian.',
            'status' => $status->value,
            'is_demo' => true,
        ];
    }
}

<?php

namespace Tests\Feature\Domain;

use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\Address;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\WasteCategory;
use App\Models\WasteType;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_executable_content_disguised_as_image_is_rejected_before_persistence(): void
    {
        Storage::fake('local');
        config()->set('ecovillage.uploads.disk', 'local');
        $this->seed(RolePermissionSeeder::class);

        $region = Region::query()->create([
            'level' => RegionLevel::Rt,
            'code' => 'RT-UPLOAD',
            'name' => 'RT Upload',
            'slug' => 'rt-upload',
        ]);
        $citizen = User::factory()->create(['name' => 'Warga Uji Upload']);
        $citizen->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $citizen->id, 'primary_region_id' => $region->id]);
        $address = Address::query()->create([
            'user_id' => $citizen->id,
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat sintetis upload',
            'is_primary' => true,
        ]);
        $category = WasteCategory::query()->create(['name' => 'Organik Upload', 'slug' => 'organik-upload']);
        $wasteType = WasteType::query()->create([
            'waste_category_id' => $category->id,
            'name' => 'Daun Upload',
            'slug' => 'daun-upload',
        ]);

        $dangerousUpload = UploadedFile::fake()->createWithContent(
            'bukti.jpg',
            "<?php file_put_contents('owned.txt', 'executed'); ?>",
        );

        $this->actingAs($citizen)
            ->post(route('collections.store'), [
                'address_id' => $address->id,
                'method' => 'pickup',
                'desired_at' => now()->addDay()->toDateTimeString(),
                'items' => [[
                    'waste_type_id' => $wasteType->id,
                    'estimated_weight' => '1.000',
                ]],
                'photos' => [$dangerousUpload],
            ])
            ->assertSessionHasErrors('photos.0');

        $this->assertDatabaseCount('collection_requests', 0);
        $this->assertDatabaseCount('collection_photos', 0);
        Storage::disk('local')->assertMissing('owned.txt');
    }
}

<?php

namespace Tests\Feature\Domain;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionExportSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_requires_permission_scopes_rows_and_neutralizes_spreadsheet_formulas(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $regionA = $this->region('A');
        $regionB = $this->region('B');
        $manager = User::factory()->create(['name' => 'Pengelola Ekspor']);
        $manager->assignRole(RoleName::ProgramManager->value);
        UserProfile::query()->create(['user_id' => $manager->id, 'primary_region_id' => $regionA->id]);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $regionA->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);
        $citizenA = $this->citizen($regionA, '=2+2');
        $citizenB = $this->citizen($regionB, 'Warga Privat Wilayah B');
        $visible = $this->collection($citizenA, $regionA, '=FORMULA-A');
        $hidden = $this->collection($citizenB, $regionB, 'EV-PRIVATE-B');

        $this->actingAs($citizenA)
            ->get(route('admin.exports.collections'))
            ->assertForbidden();

        $response = $this->actingAs($manager)->get(route('admin.exports.collections'));
        $response->assertOk()->assertDownload();
        $content = $response->streamedContent();

        $this->assertStringContainsString("'=FORMULA-A", $content);
        $this->assertStringContainsString("'=2+2", $content);
        $this->assertStringContainsString($regionA->name, $content);
        $this->assertStringNotContainsString($hidden->request_number, $content);
        $this->assertStringNotContainsString($regionB->name, $content);
        $this->assertStringNotContainsString("\n=FORMULA-A", $content);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'collections.exported',
            'actor_id' => $manager->id,
        ]);
        $this->assertSame($visible->id, CollectionRequest::query()->where('request_number', '=FORMULA-A')->sole()->id);
    }

    private function region(string $suffix): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => "RW-EXPORT-{$suffix}",
            'name' => "RW Export {$suffix}",
            'slug' => strtolower("rw-export-{$suffix}"),
        ]);
    }

    private function citizen(Region $region, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);

        return $user;
    }

    private function collection(User $citizen, Region $region, string $number): CollectionRequest
    {
        return CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $region->id,
            'request_number' => $number,
            'address_snapshot' => ['address_line' => 'Alamat sintetis ekspor'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Submitted,
            'desired_at' => now()->addDay(),
            'submitted_at' => now(),
        ]);
    }
}

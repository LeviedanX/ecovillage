<?php

namespace Tests\Feature\Domain;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthorizationBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_is_denied_operational_and_administrative_endpoints(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = $this->region('AUTH');
        $citizen = $this->citizen($region, 'Warga Tanpa Hak Staf');

        $this->actingAs($citizen)
            ->get(route('operations.collections.index'))
            ->assertForbidden();

        $this->actingAs($citizen)
            ->get(route('admin.exports.collections'))
            ->assertForbidden();

        $this->actingAs($citizen)
            ->post(route('admin.points.adjust', $citizen), [
                'amount' => 10,
                'reason' => 'Percobaan penyesuaian tanpa izin.',
                'idempotency_key' => 'citizen-denied-adjustment',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('point_transactions', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_citizen_collection_index_and_detail_are_limited_to_own_records(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = $this->region('OWN');
        $citizen = $this->citizen($region, 'Warga Satu');
        $otherCitizen = $this->citizen($region, 'Warga Dua');

        $own = $this->collection($citizen, $region, 'EV-OWN-001');
        $other = $this->collection($otherCitizen, $region, 'EV-OTHER-001');

        $this->actingAs($citizen)
            ->get(route('collections.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('collections/index')
                ->has('collections.data', 1)
                ->where('collections.data.0.id', $own->id)
                ->where('collections.data.0.request_number', 'EV-OWN-001'));

        $this->actingAs($citizen)
            ->get(route('collections.show', $other))
            ->assertForbidden();
    }

    private function region(string $suffix): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rt,
            'code' => "RT-{$suffix}",
            'name' => "RT {$suffix}",
            'slug' => strtolower("rt-{$suffix}"),
        ]);
    }

    private function citizen(Region $region, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create([
            'user_id' => $user->id,
            'primary_region_id' => $region->id,
        ]);

        return $user;
    }

    private function collection(User $requester, Region $region, string $number): CollectionRequest
    {
        return CollectionRequest::query()->create([
            'requester_id' => $requester->id,
            'region_id' => $region->id,
            'request_number' => $number,
            'address_snapshot' => ['address_line' => 'Alamat sintetis untuk pengujian'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Submitted,
            'submitted_at' => now(),
        ]);
    }
}

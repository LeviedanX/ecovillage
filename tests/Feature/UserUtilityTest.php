<?php

namespace Tests\Feature;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use App\Notifications\SystemNotification;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserUtilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_global_search_does_not_leak_collections_between_citizens(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $regionA = $this->region('A');
        $regionB = $this->region('B');
        $citizenA = $this->citizen($regionA, 'Warga Pencarian A');
        $citizenB = $this->citizen($regionB, 'Warga Pencarian B');
        $collectionA = $this->collection($citizenA, $regionA, 'EV-TARGET-A');
        $this->collection($citizenB, $regionB, 'EV-TARGET-B');

        $this->actingAs($citizenA)
            ->get(route('search', ['q' => 'TARGET']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('utilities/search')
                ->where('query', 'TARGET')
                ->has('results.collections', 1)
                ->where('results.collections.0.title', $collectionA->request_number)
                ->where('results.collections.0.href', "/pengumpulan/{$collectionA->id}"));
    }

    public function test_notification_center_allows_reading_only_owned_notifications(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = $this->region('NOTIFICATION');
        $owner = $this->citizen($region, 'Pemilik Notifikasi');
        $other = $this->citizen($region, 'Pengguna Lain');
        $owner->notify(new SystemNotification('Status diperbarui', 'Permintaan telah selesai.', '/pengumpulan'));
        $other->notify(new SystemNotification('Privat', 'Notifikasi milik pengguna lain.', '/dashboard'));
        $ownerNotification = $owner->unreadNotifications()->sole();
        $otherNotification = $other->unreadNotifications()->sole();

        $this->actingAs($owner)
            ->get(route('notifications.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('utilities/notifications')
                ->has('notifications.data', 1)
                ->where('notifications.data.0.id', $ownerNotification->id)
                ->where('notifications.data.0.title', 'Status diperbarui'));

        $this->actingAs($owner)
            ->patch(route('notifications.read', $otherNotification->id))
            ->assertNotFound();
        $this->assertNull($otherNotification->fresh()->read_at);

        $this->actingAs($owner)
            ->patch(route('notifications.read', $ownerNotification->id))
            ->assertRedirect();
        $this->assertNotNull($ownerNotification->fresh()->read_at);
    }

    public function test_mark_all_read_updates_only_authenticated_users_notifications(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = $this->region('ALL');
        $owner = $this->citizen($region, 'Pemilik Semua Notifikasi');
        $other = $this->citizen($region, 'Pemilik Notifikasi Terpisah');
        $owner->notify(new SystemNotification('Satu', 'Pesan satu.', '/dashboard'));
        $owner->notify(new SystemNotification('Dua', 'Pesan dua.', '/dashboard'));
        $other->notify(new SystemNotification('Lain', 'Pesan lain.', '/dashboard'));

        $this->actingAs($owner)
            ->patch(route('notifications.read-all'))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(0, $owner->fresh()->unreadNotifications()->count());
        $this->assertSame(1, $other->fresh()->unreadNotifications()->count());
    }

    private function region(string $suffix): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => "RW-UTILITY-{$suffix}",
            'name' => "RW Utility {$suffix}",
            'slug' => strtolower("rw-utility-{$suffix}"),
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

    private function collection(User $citizen, Region $region, string $number): CollectionRequest
    {
        return CollectionRequest::query()->create([
            'requester_id' => $citizen->id,
            'region_id' => $region->id,
            'request_number' => $number,
            'address_snapshot' => ['address_line' => 'Alamat sintetis untuk pengujian'],
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Submitted,
            'submitted_at' => now(),
        ]);
    }
}

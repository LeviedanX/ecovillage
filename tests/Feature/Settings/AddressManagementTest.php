<?php

namespace Tests\Feature\Settings;

use App\Enums\RegionLevel;
use App\Models\Address;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AddressManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_text_address_without_coordinates_does_not_require_location_consent(): void
    {
        $user = User::factory()->create();
        $region = $this->region('TEXT');

        $this->actingAs($user)->post(route('addresses.store'), [
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat tekstual sintetis tanpa titik koordinat',
            'latitude' => '',
            'longitude' => '',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $address = Address::query()->sole();
        $this->assertNull($address->latitude);
        $this->assertNull($address->longitude);
        $this->assertNull($address->location_consent_at);
        $this->assertTrue($address->is_primary);
    }

    public function test_primary_address_cannot_be_unset_without_a_replacement(): void
    {
        $user = User::factory()->create();
        $region = $this->region('PRIMARY');
        $address = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat utama sintetis untuk pengujian',
            'is_primary' => true,
        ]);

        $this->actingAs($user)->put(route('addresses.update', $address), [
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat utama sintetis untuk pengujian',
            'is_primary' => false,
        ])->assertSessionHasErrors('is_primary');

        $this->assertTrue($address->fresh()->is_primary);
    }

    public function test_deleting_primary_address_promotes_another_address(): void
    {
        $user = User::factory()->create();
        $regionA = $this->region('A');
        $regionB = $this->region('B');
        $profile = UserProfile::query()->create([
            'user_id' => $user->id,
            'primary_region_id' => $regionA->id,
        ]);
        $primary = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $regionA->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat utama sintetis yang akan dihapus',
            'is_primary' => true,
        ]);
        $replacement = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $regionB->id,
            'label' => 'Posko',
            'address_line' => 'Alamat pengganti sintetis setelah penghapusan',
            'is_primary' => false,
        ]);

        $this->actingAs($user)
            ->delete(route('addresses.destroy', $primary))
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertNull($primary->fresh());
        $this->assertTrue($replacement->fresh()->is_primary);
        $this->assertSame($regionB->id, $profile->fresh()->primary_region_id);
    }

    private function region(string $suffix): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rt,
            'code' => "RT-ADDRESS-{$suffix}",
            'name' => "RT Address {$suffix}",
            'slug' => strtolower("rt-address-{$suffix}"),
        ]);
    }
}

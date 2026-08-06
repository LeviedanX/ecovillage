<?php

namespace Tests\Feature\Settings;

use App\Enums\CollectionMethod;
use App\Enums\CollectionStatus;
use App\Enums\RedemptionStatus;
use App\Enums\RegionLevel;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\CollectionRequest;
use App\Models\PointAccount;
use App\Models\Redemption;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@gmail.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@gmail.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_profile_email_must_use_gmail_domain(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response->assertSessionHasErrors('email');
        $this->assertSame($user->email, $user->fresh()->email);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_anonymize_their_account_while_referential_history_is_retained()
    {
        $region = Region::query()->create([
            'level' => RegionLevel::Rt,
            'code' => 'RT-ANON',
            'name' => 'RT Anonimisasi',
            'slug' => 'rt-anonimisasi',
        ]);
        $user = User::factory()->create();
        $user->forceFill([
            'two_factor_secret' => 'secret-sintetis',
            'two_factor_recovery_codes' => 'kode-sintetis',
            'two_factor_confirmed_at' => now(),
        ])->save();
        $profile = UserProfile::query()->create([
            'user_id' => $user->id,
            'primary_region_id' => $region->id,
            'phone' => '080000000000',
            'bio' => 'Bio sintetis',
        ]);
        $address = Address::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'label' => 'Rumah',
            'address_line' => 'Alamat sintetis yang harus dianonimkan',
            'latitude' => '-7.9817000',
            'longitude' => '112.6718000',
            'location_consent_at' => now(),
            'is_primary' => true,
        ]);
        $assignment = RegionUserAssignment::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'assignment_type' => 'kader',
            'is_active' => true,
        ]);
        $collection = CollectionRequest::query()->create([
            'requester_id' => $user->id,
            'region_id' => $region->id,
            'address_id' => $address->id,
            'request_number' => 'EV-ANON-001',
            'address_snapshot' => ['address_line' => 'Alamat privat sintetis'],
            'latitude' => '-7.9817000',
            'longitude' => '112.6718000',
            'location_consent_at' => now(),
            'method' => CollectionMethod::Pickup,
            'status' => CollectionStatus::Submitted,
            'idempotency_key' => 'anon-collection-001',
        ]);
        $redemption = Redemption::query()->create([
            'user_id' => $user->id,
            'region_id' => $region->id,
            'number' => 'RDM-ANON-001',
            'total_points' => 10,
            'status' => RedemptionStatus::Pending,
            'idempotency_key' => 'anon-redemption-001',
            'address_snapshot' => ['address_line' => 'Alamat privat sintetis'],
        ]);
        $pointAccount = PointAccount::query()->create(['user_id' => $user->id, 'balance' => 25]);
        DB::table('passkeys')->insert([
            'user_id' => $user->id,
            'name' => 'Passkey sintetis',
            'credential_id' => 'credential-anon-001',
            'credential' => json_encode(['synthetic' => true], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('sessions')->insert([
            'id' => 'other-session-anon-001',
            'user_id' => $user->id,
            'ip_address' => '192.0.2.10',
            'user_agent' => 'Synthetic test agent',
            'payload' => 'synthetic',
            'last_activity' => now()->timestamp,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route('profile.destroy'), [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $anonymized = $user->fresh();
        $this->assertNotNull($anonymized);
        $this->assertNotNull($anonymized->anonymized_at);
        $this->assertStringStartsWith('Pengguna nonaktif #', $anonymized->name);
        $this->assertStringEndsWith('@anonymized.invalid', $anonymized->email);
        $this->assertNull($anonymized->email_verified_at);
        $this->assertNull($anonymized->two_factor_secret);
        $this->assertNull($anonymized->two_factor_recovery_codes);
        $this->assertNull($anonymized->two_factor_confirmed_at);
        $this->assertNull($profile->fresh()->primary_region_id);
        $this->assertNull($profile->fresh()->phone);
        $this->assertFalse($assignment->fresh()->is_active);
        $this->assertSame(['redacted' => true], $collection->fresh()->address_snapshot);
        $this->assertNull($collection->fresh()->latitude);
        $this->assertNull($collection->fresh()->longitude);
        $this->assertNull($redemption->fresh()->address_snapshot);
        $this->assertDatabaseCount('passkeys', 0);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('point_accounts', ['id' => $pointAccount->id, 'balance' => 25]);

        $audit = AuditLog::query()->where('event', 'account.anonymized')->sole();
        $this->assertSame(['account_state' => 'anonymized'], $audit->after);
        $this->assertArrayNotHasKey('email', $audit->before);
        $this->assertArrayNotHasKey('name', $audit->before);
        $this->assertNull($audit->ip_address);
        $this->assertNull($audit->user_agent);
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->fresh());
    }
}

<?php

namespace Tests\Feature\Domain;

use App\Enums\ContentReportStatus;
use App\Enums\ForumContentStatus;
use App\Enums\PointTransactionType;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\ContentReport;
use App\Models\ForumSpace;
use App\Models\ForumThread;
use App\Models\PointAccount;
use App\Models\PointTransaction;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\SiteSetting;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminOperationsCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_cannot_open_administration_center(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $citizen = User::factory()->create();
        $citizen->assignRole(RoleName::Citizen->value);

        $this->actingAs($citizen)
            ->get(route('admin.operations'))
            ->assertForbidden();
    }

    public function test_manager_only_receives_users_ledger_and_reports_from_assigned_region(): void
    {
        $this->seed(RolePermissionSeeder::class);
        [$regionA, $regionB] = $this->regions();
        $manager = User::factory()->create(['name' => 'Pengelola Wilayah A']);
        $manager->assignRole(RoleName::ProgramManager->value);
        RegionUserAssignment::query()->create([
            'user_id' => $manager->id,
            'region_id' => $regionA->id,
            'assignment_type' => RoleName::ProgramManager->value,
        ]);
        $citizenA = $this->citizen($regionA, 'Warga Wilayah A');
        $citizenB = $this->citizen($regionB, 'Warga Wilayah B');
        $transactionA = $this->transaction($citizenA, 40, 100, 'ledger-a');
        $this->transaction($citizenB, 50, 150, 'ledger-b');
        $reportA = $this->report($regionA, $citizenA, 'Laporan Wilayah A');
        $reportB = $this->report($regionB, $citizenB, 'Laporan Wilayah B');
        SiteSetting::query()->create([
            'key' => 'general.public_message',
            'value' => ['Aktif'],
            'type' => 'string',
            'group' => 'general',
            'is_public' => true,
        ]);

        $this->actingAs($manager)
            ->get(route('admin.operations'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations')
                ->has('users.data', 1)
                ->where('users.data.0.id', $citizenA->id)
                ->where('users.data.0.primary_region', $regionA->name)
                ->where('users.data.0.point_balance', 100)
                ->has('pointTransactions.data', 1)
                ->where('pointTransactions.data.0.id', $transactionA->id)
                ->where('pointTransactions.data.0.reversible', true)
                ->has('reports.data', 1)
                ->where('reports.data.0.id', $reportA->id)
                ->where('reports.data.0.content_type', 'thread')
                ->where('reports.data.0.reportable.title', 'Laporan Wilayah A')
                ->where('siteSettings', [])
                ->where('roles', [])
                ->where('filters', [
                    'q' => '',
                    'role' => '',
                    'report_status' => '',
                    'transaction_type' => '',
                ]));

        $this->actingAs($manager)
            ->patch(route('admin.reports.resolve', $reportB), [
                'status' => ContentReportStatus::Resolved->value,
                'resolution_notes' => 'Percobaan lintas wilayah harus selalu ditolak.',
            ])
            ->assertForbidden();
        $this->assertSame(ContentReportStatus::Pending, $reportB->fresh()->status);
    }

    public function test_super_admin_receives_global_data_and_only_valid_reversals_are_exposed(): void
    {
        $this->seed(RolePermissionSeeder::class);
        [$regionA, $regionB] = $this->regions();
        $superAdmin = User::factory()->create(['name' => 'Super Admin Pengujian']);
        $superAdmin->assignRole(RoleName::SuperAdmin->value);
        $citizenA = $this->citizen($regionA, 'Warga Global A');
        $citizenB = $this->citizen($regionB, 'Warga Global B');
        $valid = $this->transaction($citizenA, 25, 100, 'valid-reversal');
        $invalid = $this->transaction($citizenB, 200, 50, 'invalid-reversal');
        $this->report($regionA, $citizenA, 'Laporan Global A');
        $this->report($regionB, $citizenB, 'Laporan Global B');
        $setting = SiteSetting::query()->create([
            'key' => 'general.banner',
            'value' => ['Pesan uji sintetis'],
            'type' => 'string',
            'group' => 'general',
            'is_public' => true,
        ]);

        $this->actingAs($superAdmin)
            ->get(route('admin.operations', ['transaction_type' => PointTransactionType::Earn->value]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations')
                ->has('users.data', 3)
                ->has('pointTransactions.data', 2)
                ->where('pointTransactions.data', function ($transactions) use ($valid, $invalid): bool {
                    $byId = $transactions->keyBy('id');

                    return $byId->get($valid->id)['reversible'] === true
                        && $byId->get($invalid->id)['reversible'] === false;
                })
                ->has('reports.data', 2)
                ->has('siteSettings', 1)
                ->where('siteSettings.0.id', $setting->id)
                ->has('roles', 4)
                ->where('filters.transaction_type', PointTransactionType::Earn->value));

        $this->actingAs($superAdmin)
            ->get(route('admin.operations', ['role' => 'owner']))
            ->assertRedirect()
            ->assertSessionHasErrors('role');
    }

    /** @return array{Region, Region} */
    private function regions(): array
    {
        $regionA = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-ADMIN-A',
            'name' => 'RW Admin A',
            'slug' => 'rw-admin-a',
        ]);
        $regionB = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-ADMIN-B',
            'name' => 'RW Admin B',
            'slug' => 'rw-admin-b',
        ]);

        return [$regionA, $regionB];
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

    private function transaction(User $user, int $amount, int $balance, string $key): PointTransaction
    {
        $account = PointAccount::query()->create([
            'user_id' => $user->id,
            'balance' => $balance,
        ]);

        return PointTransaction::query()->create([
            'point_account_id' => $account->id,
            'user_id' => $user->id,
            'type' => PointTransactionType::Earn,
            'amount' => $amount,
            'balance_before' => 0,
            'balance_after' => $amount,
            'idempotency_key' => $key,
            'reason' => 'Transaksi sintetis untuk pengujian pusat administrasi.',
            'occurred_at' => now(),
        ]);
    }

    private function report(Region $region, User $author, string $title): ContentReport
    {
        $space = ForumSpace::query()->create([
            'region_id' => $region->id,
            'name' => "Forum {$region->name}",
            'slug' => 'forum-'.$region->slug,
            'visibility' => 'region',
            'is_active' => true,
        ]);
        $thread = ForumThread::query()->create([
            'forum_space_id' => $space->id,
            'user_id' => $author->id,
            'title' => $title,
            'slug' => Str::slug($title),
            'body' => 'Konten sintetis yang aman untuk pengujian moderasi.',
            'status' => ForumContentStatus::Visible,
            'is_locked' => false,
        ]);

        return ContentReport::query()->create([
            'reporter_id' => $author->id,
            'reportable_type' => $thread->getMorphClass(),
            'reportable_id' => $thread->id,
            'reason' => 'spam',
            'description' => 'Deskripsi laporan sintetis untuk pengujian isolasi wilayah.',
            'status' => ContentReportStatus::Pending,
        ]);
    }
}

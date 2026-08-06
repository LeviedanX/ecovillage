<?php

namespace Tests\Feature\Domain;

use App\Enums\ForumContentStatus;
use App\Enums\RegionLevel;
use App\Enums\RoleName;
use App\Models\ForumSpace;
use App\Models\ForumThread;
use App\Models\Region;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ForumRegionIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_cannot_read_create_or_report_content_across_regions(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $regionA = $this->region('A');
        $regionB = $this->region('B');
        $citizenA = $this->citizen($regionA, 'Warga Forum A');
        $citizenB = $this->citizen($regionB, 'Warga Forum B');
        $spaceA = ForumSpace::query()->create([
            'region_id' => $regionA->id,
            'name' => 'Forum Wilayah A',
            'slug' => 'forum-wilayah-a',
            'visibility' => 'region',
            'is_active' => true,
        ]);
        $spaceB = ForumSpace::query()->create([
            'region_id' => $regionB->id,
            'name' => 'Forum Wilayah B',
            'slug' => 'forum-wilayah-b',
            'visibility' => 'region',
            'is_active' => true,
        ]);
        $threadA = $this->thread($spaceA, $citizenA, 'Topik Wilayah A');
        $threadB = $this->thread($spaceB, $citizenB, 'Topik Rahasia Wilayah B');

        $this->assertTrue($citizenA->hasPermissionTo('forum.access'));
        $this->assertTrue($citizenA->can('forum.access'));
        $this->actingAs($citizenA)
            ->get(route('forum.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('forum/index')
                ->has('spaces', 1)
                ->where('spaces.0.id', $spaceA->id)
                ->has('threads.data', 1)
                ->where('threads.data.0.id', $threadA->id));

        $this->actingAs($citizenA)
            ->get(route('forum.show', $threadB))
            ->assertForbidden();

        $this->actingAs($citizenA)
            ->post(route('forum.store'), [
                'forum_space_id' => $spaceB->id,
                'title' => 'Percobaan lintas wilayah',
                'body' => 'Konten percobaan lintas wilayah harus selalu ditolak.',
            ])
            ->assertForbidden();

        $this->actingAs($citizenA)
            ->post(route('forum.report'), [
                'type' => 'thread',
                'id' => $threadB->id,
                'reason' => 'spam',
                'description' => 'Tidak boleh dapat melaporkan konten yang tidak dapat diakses.',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('forum_threads', 2);
        $this->assertDatabaseCount('content_reports', 0);
    }

    private function region(string $suffix): Region
    {
        return Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => "RW-FORUM-{$suffix}",
            'name' => "RW Forum {$suffix}",
            'slug' => strtolower("rw-forum-{$suffix}"),
        ]);
    }

    private function citizen(Region $region, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(RoleName::Citizen->value);
        UserProfile::query()->create(['user_id' => $user->id, 'primary_region_id' => $region->id]);

        return $user;
    }

    private function thread(ForumSpace $space, User $author, string $title): ForumThread
    {
        return ForumThread::query()->create([
            'forum_space_id' => $space->id,
            'user_id' => $author->id,
            'title' => $title,
            'slug' => strtolower(str_replace(' ', '-', $title)),
            'body' => 'Isi forum sintetis yang cukup panjang untuk pengujian.',
            'status' => ForumContentStatus::Visible,
            'is_locked' => false,
        ]);
    }
}

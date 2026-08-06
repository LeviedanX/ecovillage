<?php

namespace Tests\Feature\Domain;

use App\Enums\ForumContentStatus;
use App\Enums\ProgramStatus;
use App\Enums\ProgramType;
use App\Enums\RegionLevel;
use App\Enums\RegistrationStatus;
use App\Enums\RoleName;
use App\Models\ForumSpace;
use App\Models\ForumThread;
use App\Models\Program;
use App\Models\ProgramRegistration;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForumProgramAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_program_space_is_limited_to_active_participants_and_authorized_moderators(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $region = Region::query()->create([
            'level' => RegionLevel::Rw,
            'code' => 'RW-FORUM-PROGRAM',
            'name' => 'RW Forum Program',
            'slug' => 'rw-forum-program',
        ]);
        $participant = $this->user($region, RoleName::Citizen, 'Peserta Aktif');
        $cancelledParticipant = $this->user($region, RoleName::Citizen, 'Peserta Batal');
        $moderator = $this->user($region, RoleName::ProgramManager, 'Moderator Program');
        RegionUserAssignment::query()->create([
            'user_id' => $moderator->id,
            'region_id' => $region->id,
            'assignment_type' => RoleName::ProgramManager->value,
            'is_active' => true,
        ]);
        $program = Program::query()->create([
            'region_id' => $region->id,
            'manager_id' => $moderator->id,
            'type' => ProgramType::EcoCycle,
            'title' => 'Program Forum Sintetis',
            'slug' => 'program-forum-sintetis',
            'description' => 'Program sintetis untuk pengujian isolasi ruang forum.',
            'status' => ProgramStatus::RegistrationOpen,
        ]);
        ProgramRegistration::query()->create([
            'program_id' => $program->id,
            'user_id' => $participant->id,
            'status' => RegistrationStatus::Confirmed,
            'registered_at' => now(),
        ]);
        ProgramRegistration::query()->create([
            'program_id' => $program->id,
            'user_id' => $cancelledParticipant->id,
            'status' => RegistrationStatus::Cancelled,
            'registered_at' => now()->subDay(),
            'cancelled_at' => now(),
        ]);
        $space = ForumSpace::query()->create([
            'region_id' => $region->id,
            'program_id' => $program->id,
            'name' => 'Forum Peserta Program',
            'slug' => 'forum-peserta-program',
            'visibility' => 'program',
            'is_active' => true,
        ]);
        $thread = ForumThread::query()->create([
            'forum_space_id' => $space->id,
            'user_id' => $participant->id,
            'title' => 'Topik internal peserta',
            'slug' => 'topik-internal-peserta',
            'body' => 'Isi sintetis yang hanya boleh dibaca peserta aktif dan moderator.',
            'status' => ForumContentStatus::Visible,
            'is_locked' => false,
        ]);

        $this->actingAs($participant)->get(route('forum.show', $thread))->assertOk();
        $this->actingAs($cancelledParticipant)->get(route('forum.show', $thread))->assertForbidden();
        $this->actingAs($moderator)->get(route('forum.show', $thread))->assertOk();
    }

    private function user(Region $region, RoleName $role, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole($role->value);
        UserProfile::query()->create([
            'user_id' => $user->id,
            'primary_region_id' => $region->id,
        ]);

        return $user;
    }
}

<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_an_avatar(): void
    {
        Storage::fake(UserProfile::AVATAR_DISK);
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->post(route('profile.avatar.update'), [
                'avatar' => UploadedFile::fake()->image('foto.jpg', 400, 400),
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $profile = $user->fresh()->profile;

        $this->assertNotNull($profile->avatar_path);
        $this->assertSame(UserProfile::AVATAR_DISK, $profile->avatar_disk);
        Storage::disk(UserProfile::AVATAR_DISK)->assertExists($profile->avatar_path);
    }

    public function test_replacing_an_avatar_removes_the_previous_file(): void
    {
        Storage::fake(UserProfile::AVATAR_DISK);
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('lama.jpg', 400, 400),
        ]);
        $firstPath = $user->fresh()->profile->avatar_path;

        $this->actingAs($user)->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('baru.jpg', 400, 400),
        ]);
        $secondPath = $user->fresh()->profile->avatar_path;

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk(UserProfile::AVATAR_DISK)->assertMissing($firstPath);
        Storage::disk(UserProfile::AVATAR_DISK)->assertExists($secondPath);
    }

    public function test_user_can_remove_their_avatar(): void
    {
        Storage::fake(UserProfile::AVATAR_DISK);
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('foto.jpg', 400, 400),
        ]);
        $path = $user->fresh()->profile->avatar_path;

        $this->actingAs($user)
            ->delete(route('profile.avatar.destroy'))
            ->assertRedirect(route('profile.edit'));

        $this->assertNull($user->fresh()->profile->avatar_path);
        Storage::disk(UserProfile::AVATAR_DISK)->assertMissing($path);
    }

    public function test_non_image_upload_is_rejected(): void
    {
        Storage::fake(UserProfile::AVATAR_DISK);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('profile.edit'))
            ->post(route('profile.avatar.update'), [
                'avatar' => UploadedFile::fake()->create('skrip.php', 12, 'text/php'),
            ])
            ->assertSessionHasErrors('avatar');

        $this->assertNull($user->fresh()->profile?->avatar_path);
    }

    public function test_undersized_image_is_rejected(): void
    {
        Storage::fake(UserProfile::AVATAR_DISK);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('profile.edit'))
            ->post(route('profile.avatar.update'), [
                'avatar' => UploadedFile::fake()->image('kecil.jpg', 48, 48),
            ])
            ->assertSessionHasErrors('avatar');
    }

    public function test_guest_cannot_upload_an_avatar(): void
    {
        $this->post(route('profile.avatar.update'), [
            'avatar' => UploadedFile::fake()->image('foto.jpg', 400, 400),
        ])->assertRedirect(route('login'));
    }
}

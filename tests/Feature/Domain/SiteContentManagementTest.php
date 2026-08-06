<?php

namespace Tests\Feature\Domain;

use App\Enums\RoleName;
use App\Models\MediaAsset;
use App\Models\PageContent;
use App\Models\SiteSetting;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteContentManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_super_admin_can_open_the_content_panel(): void
    {
        $this->seedContent();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->get(route('admin.site-content.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/site-content')
                ->has('settings')
                ->has('pages', 8)
                ->has('media'));

        foreach ([RoleName::Citizen, RoleName::Officer, RoleName::ProgramManager] as $role) {
            $this->actingAs($this->userWithRole($role))
                ->get(route('admin.site-content.index'))
                ->assertForbidden();
        }
    }

    public function test_manager_cannot_change_public_texts(): void
    {
        $this->seedContent();

        $this->actingAs($this->userWithRole(RoleName::ProgramManager))
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'landing_hero_lead', 'value' => 'Disusupi pengelola']],
            ])
            ->assertForbidden();

        $this->assertSame(
            'Aksi lingkungan warga,',
            SiteSetting::query()->where('key', 'landing_hero_lead')->first()->stringValue(),
        );
    }

    public function test_super_admin_updates_landing_texts_and_public_page_reflects_it(): void
    {
        $this->seedContent();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [
                    ['key' => 'landing_hero_lead', 'value' => 'Judul baru'],
                    ['key' => 'landing_hero_subtitle', 'value' => 'Subjudul yang sudah diganti admin.'],
                    ['key' => 'landing_hero_primary_cta_label', 'value' => 'Gabung sekarang'],
                ],
            ])
            ->assertSessionHasNoErrors();

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('siteSettings.landing_hero_lead', 'Judul baru')
                ->where('siteSettings.landing_hero_subtitle', 'Subjudul yang sudah diganti admin.')
                ->where('siteSettings.landing_hero_primary_cta_label', 'Gabung sekarang'));

        $this->assertDatabaseHas('audit_logs', ['event' => 'site-setting.updated']);
    }

    public function test_unknown_setting_keys_are_rejected(): void
    {
        $this->seedContent();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'landing_hero_evil', 'value' => 'x']],
            ])
            ->assertSessionHasErrors('settings.0.key');
    }

    public function test_external_links_and_bad_colors_are_rejected(): void
    {
        $this->seedContent();
        $admin = $this->userWithRole(RoleName::SuperAdmin);

        $this->actingAs($admin)
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'landing_hero_primary_cta_href', 'value' => 'https://situs-penipu.example']],
            ])
            ->assertSessionHasErrors('settings.0.value');

        $this->actingAs($admin)
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'landing_hero_accent_color', 'value' => 'merah']],
            ])
            ->assertSessionHasErrors('settings.0.value');

        $this->assertSame(
            '/register',
            SiteSetting::query()->where('key', 'landing_hero_primary_cta_href')->first()->stringValue(),
        );
    }

    public function test_image_settings_only_accept_paths_from_the_media_library(): void
    {
        $this->seedContent();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'landing_hero_background_image', 'value' => 'collections/7/foto-warga.jpg']],
            ])
            ->assertSessionHasErrors('settings.0.value');
    }

    public function test_super_admin_uploads_image_and_uses_it_as_hero_background(): void
    {
        Storage::fake('public');
        $this->seedContent();
        $admin = $this->userWithRole(RoleName::SuperAdmin);

        $this->actingAs($admin)
            ->post(route('admin.site-content.media.store'), [
                'file' => UploadedFile::fake()->image('latar.jpg', 1200, 800),
                'alt_text' => 'Latar kegiatan warga',
            ])
            ->assertSessionHasNoErrors();

        $asset = MediaAsset::query()->firstOrFail();
        Storage::disk('public')->assertExists($asset->path);

        $this->actingAs($admin)
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'landing_hero_background_image', 'value' => $asset->path]],
            ])
            ->assertSessionHasNoErrors();

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('siteSettings.landing_hero_background_image', Storage::disk('public')->url($asset->path)));
    }

    public function test_non_image_upload_is_rejected(): void
    {
        Storage::fake('public');
        $this->seedContent();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->post(route('admin.site-content.media.store'), [
                'file' => UploadedFile::fake()->create('payload.php', 12, 'text/x-php'),
            ])
            ->assertSessionHasErrors('file');

        $this->assertSame(0, MediaAsset::query()->count());
    }

    public function test_media_in_use_cannot_be_deleted(): void
    {
        Storage::fake('public');
        $this->seedContent();
        $admin = $this->userWithRole(RoleName::SuperAdmin);

        $this->actingAs($admin)->post(route('admin.site-content.media.store'), [
            'file' => UploadedFile::fake()->image('dipakai.jpg'),
        ]);
        $asset = MediaAsset::query()->firstOrFail();

        $this->actingAs($admin)->patch(route('admin.site-content.settings.update'), [
            'settings' => [['key' => 'landing_hero_image', 'value' => $asset->path]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)
            ->delete(route('admin.site-content.media.destroy', $asset))
            ->assertSessionHasErrors('media');

        $this->assertSame(1, MediaAsset::query()->count());
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_super_admin_rewrites_a_static_page(): void
    {
        $this->seedContent();
        $page = PageContent::query()->where('slug', 'tentang')->firstOrFail();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->patch(route('admin.site-content.pages.update', $page), [
                'eyebrow' => 'Tentang kami',
                'title' => 'Judul yang sepenuhnya baru.',
                'lead' => 'Paragraf pembuka hasil suntingan admin.',
                'icon' => 'Sparkles',
                'is_active' => true,
                'hero_image_path' => '',
                'sections' => [
                    [
                        'title' => 'Bagian pertama',
                        'body' => 'Isi bagian pertama setelah disunting.',
                        'bullets' => ['Poin satu', 'Poin dua'],
                    ],
                ],
            ])
            ->assertSessionHasNoErrors();

        $this->get('/tentang')
            ->assertOk()
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->component('public/page')
                ->where('content.title', 'Judul yang sepenuhnya baru.')
                ->where('content.icon', 'Sparkles')
                ->has('content.sections', 1)
                ->where('content.sections.0.bullets.0', 'Poin satu'));

        $this->assertDatabaseHas('audit_logs', ['event' => 'page-content.updated']);
    }

    public function test_deactivated_page_returns_404(): void
    {
        $this->seedContent();
        $page = PageContent::query()->where('slug', 'faq')->firstOrFail();

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->patch(route('admin.site-content.pages.update', $page), [
                'eyebrow' => $page->eyebrow,
                'title' => $page->title,
                'lead' => $page->lead,
                'icon' => $page->icon,
                'is_active' => false,
                'sections' => [['title' => 'Tetap ada', 'body' => 'Isi bagian yang tetap dipertahankan.']],
            ])
            ->assertSessionHasNoErrors();

        $this->get('/faq')->assertNotFound();
    }

    public function test_manager_cannot_rewrite_a_static_page(): void
    {
        $this->seedContent();
        $page = PageContent::query()->where('slug', 'platform')->firstOrFail();
        $original = $page->title;

        $this->actingAs($this->userWithRole(RoleName::ProgramManager))
            ->patch(route('admin.site-content.pages.update', $page), [
                'eyebrow' => 'x',
                'title' => 'Dibajak',
                'lead' => 'y',
                'icon' => 'Leaf',
                'is_active' => true,
                'sections' => [['title' => 'a', 'body' => 'b']],
            ])
            ->assertForbidden();

        $this->assertSame($original, $page->fresh()->title);
    }

    public function test_bundled_background_is_preselected_and_shared_to_every_public_page(): void
    {
        $this->seedContent();

        foreach ([route('home'), '/tentang', route('catalog')] as $url) {
            $this->get($url)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('publicBackground.desktop', '/background/bgd.png')
                    ->where('publicBackground.mobile', '/background/bgp.png')
                    ->where('publicBackground.opacity', 40));
        }

        $this->actingAs($this->userWithRole(RoleName::SuperAdmin))
            ->get(route('admin.site-content.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('bundled', 2)
                ->where('bundled.0.path', '/background/bgd.png')
                ->where('settings', fn (Collection $settings) => $settings
                    ->firstWhere('key', 'public_background_desktop')['value'] === '/background/bgd.png'
                    && $settings->firstWhere('key', 'public_background_desktop')['preview_url'] === '/background/bgd.png'));
    }

    public function test_background_opacity_rejects_values_outside_zero_to_hundred(): void
    {
        $this->seedContent();
        $admin = $this->userWithRole(RoleName::SuperAdmin);

        foreach (['120', '-5', 'sedang'] as $invalid) {
            $this->actingAs($admin)
                ->patch(route('admin.site-content.settings.update'), [
                    'settings' => [['key' => 'public_background_opacity', 'value' => $invalid]],
                ])
                ->assertSessionHasErrors('settings.0.value');
        }

        $this->assertSame(
            '40',
            SiteSetting::query()->where('key', 'public_background_opacity')->first()->stringValue(),
        );
    }

    public function test_background_can_be_swapped_to_an_uploaded_image(): void
    {
        Storage::fake('public');
        $this->seedContent();
        $admin = $this->userWithRole(RoleName::SuperAdmin);

        $this->actingAs($admin)->post(route('admin.site-content.media.store'), [
            'file' => UploadedFile::fake()->image('latar-desktop.jpg', 1920, 1080),
        ]);
        $asset = MediaAsset::query()->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('admin.site-content.settings.update'), [
                'settings' => [['key' => 'public_background_desktop', 'value' => $asset->path]],
            ])
            ->assertSessionHasNoErrors();

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('publicBackground.desktop', Storage::disk('public')->url($asset->path))
                ->where('publicBackground.mobile', '/background/bgp.png'));
    }

    public function test_guest_is_redirected_from_the_content_panel(): void
    {
        $this->seedContent();

        $this->get(route('admin.site-content.index'))->assertRedirect();
        $this->patch(route('admin.site-content.settings.update'), [
            'settings' => [['key' => 'site_brand_name', 'value' => 'Dibajak']],
        ])->assertRedirect();
    }

    private function seedContent(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->seed(SiteContentSeeder::class);
    }

    private function userWithRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        return $user;
    }
}

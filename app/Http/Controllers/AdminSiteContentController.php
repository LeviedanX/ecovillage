<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\MediaAsset;
use App\Models\PageContent;
use App\Models\SiteSetting;
use App\Support\SiteContentCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Panel konten halaman publik. Seluruh aksi digate `settings.manage` yang
 * hanya dipegang super admin, sehingga teks, gambar, dan background situs
 * tidak dapat disentuh role operasional.
 */
class AdminSiteContentController extends Controller
{
    private const MEDIA_DISK = 'public';

    private const MEDIA_DIRECTORY = 'site';

    public function index(Request $request): Response
    {
        $catalog = SiteContentCatalog::settings();
        $stored = SiteSetting::query()
            ->whereIn('key', SiteContentCatalog::keys())
            ->get()
            ->keyBy('key');
        $defaults = SiteContentCatalog::defaults();

        $settings = [];
        foreach ($catalog as $key => $meta) {
            $value = $stored->get($key)?->stringValue($defaults[$key] ?? '') ?? ($defaults[$key] ?? '');

            $settings[] = [
                'key' => $key,
                'label' => $meta['label'],
                'group' => $meta['group'],
                'type' => $meta['type'],
                'help' => $meta['help'] ?? null,
                'value' => $value,
                'default' => $defaults[$key] ?? '',
                // Preview disertakan pada setiap setting gambar agar admin
                // melihat aset yang sedang aktif tanpa membuka halaman publik.
                'preview_url' => $meta['type'] === SiteContentCatalog::TYPE_IMAGE
                    ? PublicSiteController::imageUrl($value)
                    : null,
            ];
        }

        return Inertia::render('admin/site-content', [
            'settings' => $settings,
            'pages' => PageContent::query()
                ->orderBy('slug')
                ->get()
                ->map(fn (PageContent $page): array => [
                    'id' => $page->id,
                    'slug' => $page->slug,
                    'eyebrow' => $page->eyebrow,
                    'title' => $page->title,
                    'lead' => $page->lead,
                    'icon' => $page->icon,
                    'sections' => $page->sections,
                    'hero_image_path' => $page->hero_image_path ?? '',
                    'hero_image_url' => $page->heroImageUrl(),
                    'is_active' => $page->is_active,
                ]),
            'media' => MediaAsset::query()
                ->latest('id')
                ->limit(100)
                ->get()
                ->map(fn (MediaAsset $asset): array => [
                    'id' => $asset->id,
                    'path' => $asset->path,
                    'url' => $asset->url(),
                    'original_name' => $asset->original_name,
                    'alt_text' => $asset->alt_text,
                    'size_kb' => (int) round($asset->size_bytes / 1024),
                ]),
            'bundled' => array_map(
                static fn (string $path): array => [
                    'path' => $path,
                    'url' => $path,
                    'label' => basename($path).' (aset bawaan)',
                ],
                SiteContentCatalog::bundledAssets(),
            ),
            'icons' => SiteContentCatalog::ICONS,
            'maxImageKb' => (int) config('ecovillage.uploads.max_image_kilobytes'),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $catalog = SiteContentCatalog::settings();
        $validated = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', Rule::in(SiteContentCatalog::keys())],
            'settings.*.value' => ['present', 'nullable', 'string', 'max:2000'],
        ]);

        /** @var array<int, array{key: string, value: string|null}> $incoming */
        $incoming = $validated['settings'];
        foreach ($incoming as $index => $entry) {
            $this->assertValueMatchesType(
                (string) $entry['key'],
                (string) ($entry['value'] ?? ''),
                $catalog[$entry['key']]['type'],
                "settings.{$index}.value",
            );
            $this->assertKeySpecificRules(
                (string) $entry['key'],
                (string) ($entry['value'] ?? ''),
                "settings.{$index}.value",
            );
        }

        DB::transaction(function () use ($request, $incoming, $catalog): void {
            foreach ($incoming as $entry) {
                $key = (string) $entry['key'];
                $setting = SiteSetting::query()->lockForUpdate()->firstOrNew(['key' => $key]);
                $before = $setting->exists ? $setting->only(['value']) : [];

                $setting->fill([
                    'value' => ['id' => (string) ($entry['value'] ?? '')],
                    'type' => $catalog[$key]['type'],
                    'group' => $catalog[$key]['group'],
                    'is_public' => true,
                    'updated_by' => $request->user()->id,
                ])->save();

                AuditLog::record(
                    actor: $request->user(),
                    event: 'site-setting.updated',
                    auditable: $setting,
                    before: $before,
                    after: $setting->only(['value']),
                    request: $request,
                );
            }
        }, 3);

        self::flushPublicCache();

        return back()->with('success', 'Konten situs diperbarui.');
    }

    public function updatePage(Request $request, PageContent $page): RedirectResponse
    {
        $validated = $request->validate([
            'eyebrow' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:500'],
            'lead' => ['required', 'string', 'max:2000'],
            'icon' => ['required', 'string', Rule::in(SiteContentCatalog::ICONS)],
            'is_active' => ['required', 'boolean'],
            'hero_image_path' => ['nullable', 'string', 'max:255'],
            'sections' => ['required', 'array', 'min:1', 'max:12'],
            'sections.*.title' => ['required', 'string', 'max:255'],
            'sections.*.body' => ['required', 'string', 'max:5000'],
            'sections.*.bullets' => ['nullable', 'array', 'max:8'],
            'sections.*.bullets.*' => ['required', 'string', 'max:300'],
        ]);

        $heroPath = $validated['hero_image_path'] ?? null;
        if ($heroPath !== null && $heroPath !== '') {
            $this->assertManagedMedia($heroPath, 'hero_image_path');
        } else {
            $heroPath = null;
        }

        $before = $page->only(['eyebrow', 'title', 'lead', 'icon', 'sections', 'hero_image_path', 'is_active']);
        $page->update([
            'eyebrow' => $validated['eyebrow'],
            'title' => $validated['title'],
            'lead' => $validated['lead'],
            'icon' => $validated['icon'],
            'is_active' => $validated['is_active'],
            'hero_image_disk' => $heroPath === null || str_starts_with($heroPath, '/')
                ? null
                : self::MEDIA_DISK,
            'hero_image_path' => $heroPath,
            'sections' => array_values(array_map(
                static fn (array $section): array => [
                    'title' => $section['title'],
                    'body' => $section['body'],
                    'bullets' => array_values($section['bullets'] ?? []),
                ],
                $validated['sections'],
            )),
            'updated_by' => $request->user()->id,
        ]);

        AuditLog::record(
            actor: $request->user(),
            event: 'page-content.updated',
            auditable: $page,
            before: $before,
            after: $page->only(['eyebrow', 'title', 'lead', 'icon', 'sections', 'hero_image_path', 'is_active']),
            request: $request,
        );
        self::flushPublicCache();

        return back()->with('success', "Halaman /{$page->slug} diperbarui.");
    }

    public function storeMedia(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // Rule `image` memakai getimagesize sehingga berkas yang hanya
            // menyamar sebagai gambar lewat ekstensi tetap ditolak.
            'file' => [
                'required',
                'image',
                'mimes:jpeg,jpg,png,webp,avif',
                'max:'.(int) config('ecovillage.uploads.max_image_kilobytes'),
            ],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $validated['file'];
        $path = $file->store(self::MEDIA_DIRECTORY, self::MEDIA_DISK);

        $asset = MediaAsset::query()->create([
            'disk' => self::MEDIA_DISK,
            'path' => $path,
            'original_name' => mb_substr((string) $file->getClientOriginalName(), 0, 255),
            'mime_type' => (string) $file->getMimeType(),
            'size_bytes' => (int) $file->getSize(),
            'alt_text' => $validated['alt_text'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        AuditLog::record(
            actor: $request->user(),
            event: 'media-asset.uploaded',
            auditable: $asset,
            before: [],
            after: $asset->only(['path', 'mime_type', 'size_bytes']),
            request: $request,
        );

        return back()->with('success', 'Gambar diunggah.');
    }

    public function destroyMedia(Request $request, MediaAsset $media): RedirectResponse
    {
        $inUse = SiteSetting::query()
            ->whereIn('key', SiteContentCatalog::keys())
            ->get()
            ->contains(fn (SiteSetting $setting): bool => $setting->stringValue() === $media->path)
            || PageContent::query()->where('hero_image_path', $media->path)->exists();

        if ($inUse) {
            return back()->withErrors(['media' => 'Gambar masih dipakai halaman publik. Lepaskan dulu sebelum menghapus.']);
        }

        $snapshot = $media->only(['path', 'original_name']);
        Storage::disk($media->disk)->delete($media->path);
        $media->delete();

        AuditLog::record(
            actor: $request->user(),
            event: 'media-asset.deleted',
            auditable: $media,
            before: $snapshot,
            after: [],
            request: $request,
        );

        return back()->with('success', 'Gambar dihapus.');
    }

    private function assertValueMatchesType(string $key, string $value, string $type, string $field): void
    {
        if ($value === '') {
            return;
        }

        match ($type) {
            SiteContentCatalog::TYPE_TEXT => $this->assertMaxLength($value, 255, $field),
            SiteContentCatalog::TYPE_LINK => $this->assertInternalLink($value, $field),
            SiteContentCatalog::TYPE_COLOR => $this->assertHexColor($value, $field),
            SiteContentCatalog::TYPE_IMAGE => $this->assertManagedMedia($value, $field),
            default => null,
        };
    }

    private function assertMaxLength(string $value, int $max, string $field): void
    {
        if (mb_strlen($value) > $max) {
            throw ValidationException::withMessages([
                $field => "Isian ini maksimal {$max} karakter.",
            ]);
        }
    }

    /**
     * Tautan dibatasi pada path internal. Tanpa ini, panel konten menjadi
     * sarana menempelkan URL eksternal pada halaman depan.
     */
    private function assertInternalLink(string $value, string $field): void
    {
        if (preg_match('#^/[A-Za-z0-9\-_/]*$#', $value) !== 1) {
            throw ValidationException::withMessages([
                $field => 'Tautan harus berupa path internal, contoh /register.',
            ]);
        }
    }

    private function assertHexColor(string $value, string $field): void
    {
        if (preg_match('/^#[0-9a-fA-F]{6}$/', $value) !== 1) {
            throw ValidationException::withMessages([
                $field => 'Warna harus berformat heksadesimal, contoh #10b981.',
            ]);
        }
    }

    /**
     * Gambar hanya boleh berasal dari pustaka media atau direktori aset
     * bawaan. Tanpa batas ini, setting gambar dapat diarahkan ke berkas
     * privat seperti foto pengumpulan warga.
     */
    private function assertManagedMedia(string $value, string $field): void
    {
        if (SiteContentCatalog::isBundledAsset($value)) {
            return;
        }

        if (! MediaAsset::query()->where('disk', self::MEDIA_DISK)->where('path', $value)->exists()) {
            throw ValidationException::withMessages([
                $field => 'Gambar harus dipilih dari pustaka media atau aset bawaan.',
            ]);
        }
    }

    /**
     * Aturan tambahan untuk key yang bertipe teks tetapi punya domain nilai
     * sendiri.
     */
    private function assertKeySpecificRules(string $key, string $value, string $field): void
    {
        if ($key !== 'public_background_opacity' || $value === '') {
            return;
        }

        if (! ctype_digit($value) || (int) $value > 100) {
            throw ValidationException::withMessages([
                $field => 'Kepekatan harus berupa angka bulat 0 sampai 100.',
            ]);
        }
    }

    public static function flushPublicCache(): void
    {
        Cache::forget('public.home.v1');
        Cache::forget('public.background.v1');
    }
}

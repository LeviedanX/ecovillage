<?php

namespace App\Http\Controllers;

use App\Models\CollectionItem;
use App\Models\CollectionRequest;
use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\ImpactCalculation;
use App\Models\PageContent;
use App\Models\Product;
use App\Models\Program;
use App\Models\ProgramSession;
use App\Models\Region;
use App\Models\SiteSetting;
use App\Support\SiteContentCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicSiteController extends Controller
{
    public function home(): Response
    {
        $payload = Cache::remember('public.home.v1', now()->addMinutes(10), function (): array {
            $completedRequestIds = CollectionRequest::query()
                ->where('status', 'completed')
                ->pluck('id');

            $verifiedWeight = (float) CollectionItem::query()
                ->whereIn('collection_request_id', $completedRequestIds)
                ->sum('verified_weight');

            return [
                'siteSettings' => self::publicSettings(),
                'stats' => [
                    'verified_weight_kg' => round($verifiedWeight, 2),
                    'completed_collections' => $completedRequestIds->count(),
                    'households' => CollectionRequest::query()->where('status', 'completed')->distinct('requester_id')->count('requester_id'),
                    'impact_kg_co2e' => round((float) ImpactCalculation::query()->sum('total_carbon_kg_co2e'), 2),
                    'active_programs' => Program::query()->whereIn('status', ['published', 'registration_open'])->count(),
                    'participating_regions' => CollectionRequest::query()->where('status', 'completed')->distinct('region_id')->count('region_id'),
                ],
                'education' => EducationContent::query()
                    ->with('category:id,name,slug')
                    ->where('status', 'published')
                    ->whereNotNull('published_at')
                    ->latest('published_at')
                    ->limit(3)
                    ->get(['id', 'education_category_id', 'title', 'slug', 'excerpt', 'cover_disk', 'cover_path', 'published_at'])
                    ->map(fn (EducationContent $content): array => $this->educationPayload($content)),
                'programs' => Program::query()
                    ->with('region:id,name')
                    ->withCount('registrations')
                    ->whereIn('status', ['published', 'registration_open'])
                    ->orderBy('registration_starts_at')
                    ->limit(3)
                    ->get(['id', 'region_id', 'type', 'title', 'slug', 'description', 'cover_disk', 'cover_path', 'location_name', 'capacity', 'status', 'registration_ends_at', 'starts_at'])
                    ->map(fn (Program $program): array => $this->programPayload($program)),
                'products' => Product::query()
                    ->with(['category:id,name,slug', 'images'])
                    ->where('is_active', true)
                    ->where('stock', '>', 0)
                    ->latest()
                    ->limit(4)
                    ->get(['id', 'product_category_id', 'name', 'slug', 'description', 'point_price', 'stock', 'is_active'])
                    ->map(fn (Product $product): array => $this->productPayload($product)),
            ];
        });

        return Inertia::render('public/home', $payload);
    }

    public function page(string $page): Response
    {
        $content = PageContent::query()
            ->where('slug', $page)
            ->where('is_active', true)
            ->first();

        abort_if($content === null, 404);

        return Inertia::render('public/page', [
            'page' => $page,
            'content' => [
                'eyebrow' => $content->eyebrow,
                'title' => $content->title,
                'lead' => $content->lead,
                'icon' => $content->icon,
                'sections' => $content->sections,
                'hero_image_url' => $content->heroImageUrl(),
            ],
            'siteSettings' => self::publicSettings(),
        ]);
    }

    /**
     * Aset bawaan sudah berupa path absolut di document root, sedangkan
     * unggahan admin berada pada disk publik dan perlu diubah menjadi URL.
     */
    public static function imageUrl(string $value): string
    {
        if ($value === '') {
            return '';
        }

        return str_starts_with($value, '/')
            ? $value
            : Storage::disk('public')->url($value);
    }

    /**
     * Seluruh elemen halaman publik yang dapat disunting admin, sudah
     * digabung dengan nilai bawaan sehingga baris yang belum pernah dibuat
     * tetap merender teks yang benar.
     *
     * @return array<string, string>
     */
    public static function publicSettings(): array
    {
        $catalog = SiteContentCatalog::settings();
        $defaults = SiteContentCatalog::defaults();
        $stored = SiteSetting::query()
            ->where('is_public', true)
            ->whereIn('key', SiteContentCatalog::keys())
            ->get(['key', 'value'])
            ->keyBy('key');

        $resolved = [];
        foreach ($catalog as $key => $meta) {
            $fallback = $defaults[$key] ?? '';
            $value = $stored->get($key)?->stringValue($fallback) ?? $fallback;

            if ($meta['type'] === SiteContentCatalog::TYPE_IMAGE && $value !== '') {
                $value = self::imageUrl($value);
            }

            $resolved[$key] = $value;
        }

        return $resolved;
    }

    public function education(Request $request): Response
    {
        $search = trim((string) $request->string('q'));
        $category = trim((string) $request->string('category'));

        $contents = EducationContent::query()
            ->with('category:id,name,slug')
            ->where('status', 'published')
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $nested) use ($search): void {
                $nested->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%");
            }))
            ->when($category !== '', fn (Builder $query) => $query->whereHas('category', fn (Builder $categoryQuery) => $categoryQuery->where('slug', $category)))
            ->latest('published_at')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (EducationContent $content): array => $this->educationPayload($content));

        return Inertia::render('public/content-index', [
            'contents' => $contents,
            'categories' => EducationCategory::query()->orderBy('name')->get(['id', 'name', 'slug']),
            'filters' => ['search' => $search, 'category' => $category],
        ]);
    }

    public function educationShow(EducationContent $educationContent): Response
    {
        abort_unless($educationContent->status->value === 'published', 404);

        $educationContent->load(['category:id,name,slug', 'author:id,name']);
        $contentPayload = [
            ...$this->educationPayload($educationContent),
            'sanitized_html' => nl2br(e($educationContent->body)),
            'author' => $educationContent->author?->name,
        ];

        $related = EducationContent::query()
            ->with('category:id,name,slug')
            ->where('status', 'published')
            ->where('education_category_id', $educationContent->education_category_id)
            ->whereKeyNot($educationContent->id)
            ->latest('published_at')
            ->limit(3)
            ->get(['id', 'education_category_id', 'title', 'slug', 'excerpt', 'cover_disk', 'cover_path', 'published_at']);

        return Inertia::render('public/content-detail', [
            'content' => $contentPayload,
            'related' => $related->map(fn (EducationContent $content): array => $this->educationPayload($content)),
        ]);
    }

    public function programs(Request $request): Response
    {
        $type = trim((string) $request->string('type'));

        return Inertia::render('public/programs', [
            'programs' => Program::query()
                ->with('region:id,name,level')
                ->withCount('registrations')
                ->whereIn('status', ['published', 'registration_open', 'registration_closed', 'completed'])
                ->when($type !== '', fn (Builder $query) => $query->where('type', $type))
                ->orderByDesc('registration_starts_at')
                ->paginate(12)
                ->withQueryString()
                ->through(fn (Program $program): array => $this->programPayload($program)),
            'type' => $type,
        ]);
    }

    public function programShow(Program $program): Response
    {
        abort_unless(in_array($program->status->value, ['published', 'registration_open', 'registration_closed', 'completed'], true), 404);

        return Inertia::render('public/program-detail', [
            'program' => $this->programPayload($program->load(['region:id,name,level', 'sessions'])->loadCount('registrations')),
        ]);
    }

    public function catalog(Request $request): Response
    {
        $search = trim((string) $request->string('q'));

        return Inertia::render('public/catalog', [
            'products' => Product::query()
                ->with(['category:id,name,slug', 'images'])
                ->where('is_active', true)
                ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
                ->orderByDesc('stock')
                ->paginate(12)
                ->withQueryString()
                ->through(fn (Product $product): array => $this->productPayload($product)),
            'filters' => ['q' => $search],
        ]);
    }

    public function publicMap(Request $request): Response
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'category' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'integer', 'exists:regions,id'],
        ]);
        $minimum = max(3, (int) config('ecovillage.map.public_minimum_records'));
        $precision = min(2, max(0, (int) config('ecovillage.map.public_coordinate_precision', 2)));

        $aggregates = CollectionRequest::query()
            ->selectRaw('region_id, COUNT(*) as request_count')
            ->where('status', 'completed')
            ->when(isset($filters['from']), fn (Builder $query) => $query->whereDate('completed_at', '>=', $filters['from']))
            ->when(isset($filters['to']), fn (Builder $query) => $query->whereDate('completed_at', '<=', $filters['to']))
            ->when(isset($filters['region']), fn (Builder $query) => $query->where('region_id', $filters['region']))
            ->when(isset($filters['category']), fn (Builder $query) => $query->whereHas(
                'items.wasteType.category',
                fn (Builder $categoryQuery) => $categoryQuery->where('slug', $filters['category']),
            ))
            ->groupBy('region_id')
            ->havingRaw('COUNT(*) >= ?', [$minimum])
            ->get()
            ->keyBy('region_id');

        $weights = DB::table('collection_items')
            ->join('collection_requests', 'collection_requests.id', '=', 'collection_items.collection_request_id')
            ->join('waste_types', 'waste_types.id', '=', 'collection_items.waste_type_id')
            ->join('waste_categories', 'waste_categories.id', '=', 'waste_types.waste_category_id')
            ->where('collection_requests.status', 'completed')
            ->whereIn('collection_requests.region_id', $aggregates->keys())
            ->when(isset($filters['from']), fn ($query) => $query->whereDate('collection_requests.completed_at', '>=', $filters['from']))
            ->when(isset($filters['to']), fn ($query) => $query->whereDate('collection_requests.completed_at', '<=', $filters['to']))
            ->when(isset($filters['category']), fn ($query) => $query->where('waste_categories.slug', $filters['category']))
            ->selectRaw('collection_requests.region_id, SUM(collection_items.verified_weight) as total_weight')
            ->groupBy('collection_requests.region_id')
            ->pluck('total_weight', 'collection_requests.region_id');

        $regions = Region::query()
            ->whereIn('id', $aggregates->keys())
            ->whereNotNull('centroid_latitude')
            ->whereNotNull('centroid_longitude')
            ->get(['id', 'name', 'level', 'centroid_latitude', 'centroid_longitude'])
            ->map(fn (Region $region): array => [
                'region_name' => $region->name,
                'level' => $region->level->value,
                'latitude' => round((float) $region->centroid_latitude, $precision),
                'longitude' => round((float) $region->centroid_longitude, $precision),
                'request_count' => (int) $aggregates->get($region->id)?->getAttribute('request_count'),
                'weight_kg' => round((float) ($weights[$region->id] ?? 0), 3),
                'category' => $filters['category'] ?? 'semua-kategori',
            ])
            ->values();

        return Inertia::render('public/map', [
            'points' => $regions,
            'summary' => [
                'verified_weight_kg' => round((float) $weights->sum(), 3),
                'locations' => $regions->count(),
                'period_label' => ($filters['from'] ?? 'awal').' - '.($filters['to'] ?? 'sekarang'),
            ],
            'privacy' => [
                'minimum_records' => $minimum,
                'precision' => 'Koordinat pusat wilayah dibulatkan; titik rumah tidak pernah dikirim.',
            ],
            'filters' => $filters,
            'mapStyleUrl' => config('ecovillage.map.style_url'),
        ]);
    }

    public function methodology(): Response
    {
        return Inertia::render('public/methodology');
    }

    /** @return array<string, mixed> */
    private function educationPayload(EducationContent $content): array
    {
        return [
            ...$content->only(['id', 'title', 'slug', 'excerpt', 'published_at']),
            'category' => $content->category?->name,
            'cover_url' => $content->cover_path === null ? null : Storage::disk($content->cover_disk ?? 'public')->url($content->cover_path),
        ];
    }

    /** @return array<string, mixed> */
    private function programPayload(Program $program): array
    {
        return [
            ...$program->only(['id', 'type', 'title', 'slug', 'description', 'status', 'starts_at', 'ends_at', 'registration_ends_at']),
            'type' => $program->type->value,
            'status' => $program->status->value,
            'quota' => $program->capacity,
            'registered_count' => (int) ($program->registrations_count ?? 0),
            'location' => $program->location_name,
            'cover_url' => $program->cover_path === null ? null : Storage::disk($program->cover_disk ?? 'public')->url($program->cover_path),
            'region' => $program->region?->name,
            'sessions' => $program->relationLoaded('sessions')
                ? $program->sessions->map(fn (ProgramSession $session): array => $session->only([
                    'id',
                    'title',
                    'description',
                    'location_name',
                    'starts_at',
                    'ends_at',
                ]))->values()
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function productPayload(Product $product): array
    {
        $image = $product->images->first();

        return [
            ...$product->only(['id', 'name', 'slug', 'description', 'point_price', 'stock', 'is_active']),
            'category' => $product->category?->name,
            'image_url' => $image === null ? null : Storage::disk($image->disk)->url($image->path),
        ];
    }
}

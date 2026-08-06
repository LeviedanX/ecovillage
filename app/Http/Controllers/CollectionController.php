<?php

namespace App\Http\Controllers;

use App\Enums\CollectionStatus;
use App\Enums\RoleName;
use App\Http\Requests\StoreCollectionRequest;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\CollectionPhoto;
use App\Models\CollectionRequest as WasteCollection;
use App\Models\CollectionStatusHistory;
use App\Models\Region;
use App\Models\User;
use App\Models\WasteType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CollectionController extends Controller
{
    public function index(Request $request): Response
    {
        $status = trim((string) $request->string('status'));
        $search = trim((string) $request->string('search'));

        $query = WasteCollection::query()
            ->with(['items.wasteType.category', 'region:id,name,level', 'assignments.assignee:id,name'])
            ->where('requester_id', $request->user()->id)
            ->when($status !== '', fn (Builder $builder) => $builder->where('status', $status))
            ->when($search !== '', fn (Builder $builder) => $builder->where('request_number', 'like', "%{$search}%"))
            ->latest();

        return Inertia::render('collections/index', [
            'collections' => $query->paginate(12)->withQueryString(),
            'filters' => compact('status', 'search'),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', WasteCollection::class);

        $addresses = Address::query()
            ->where('user_id', $request->user()->id)
            ->with('region:id,name,level')
            ->orderByDesc('is_primary')
            ->get();

        return Inertia::render('collections/create', [
            'wasteTypes' => WasteType::query()
                ->with('category:id,name,slug,is_hazardous')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
            'regions' => Region::query()->where('is_active', true)->orderBy('code')->get(['id', 'parent_id', 'level', 'name', 'code']),
            'addresses' => $addresses,
            'defaultAddress' => $addresses->first()?->address_line,
            'locationConsent' => $addresses->first()?->location_consent_at !== null,
            'mapStyleUrl' => config('ecovillage.map.style_url'),
            'hazardousPolicy' => [
                'message' => (bool) config('ecovillage.hazardous_waste.partner_configured')
                    ? 'Sampah B3 hanya ditangani oleh petugas berwenang melalui alur rujukan khusus.'
                    : 'Pengumpulan B3 belum tersedia. Jangan campur atau serahkan kepada petugas umum; hubungi pengelola untuk arahan resmi.',
                'contact_name' => config('ecovillage.hazardous_waste.contact_name'),
                'contact_url' => config('ecovillage.hazardous_waste.contact_url'),
                'collection_enabled' => (bool) config('ecovillage.hazardous_waste.partner_configured'),
            ],
        ]);
    }

    public function store(StoreCollectionRequest $request): RedirectResponse
    {
        $this->authorize('create', WasteCollection::class);

        $validated = $request->validated();
        $wasteTypes = WasteType::query()
            ->with('category:id,is_hazardous')
            ->whereIn('id', $request->collect('items')->pluck('waste_type_id'))
            ->get()
            ->keyBy('id');

        $containsHazardous = $wasteTypes->contains(fn (WasteType $type) => (bool) $type->category->is_hazardous);
        if ($containsHazardous && ! config('ecovillage.hazardous_waste.partner_configured')) {
            throw ValidationException::withMessages([
                'items' => 'Pengumpulan B3 belum tersedia. Jangan serahkan kepada petugas umum; hubungi pengelola untuk arahan resmi.',
            ]);
        }

        $address = Address::query()
            ->whereKey($validated['address_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        $idempotencyKey = $validated['idempotency_key'] ?? (string) Str::uuid();
        $locationConsent = (bool) ($validated['location_consent'] ?? false);

        $collection = DB::transaction(function () use ($request, $validated, $address, $idempotencyKey, $containsHazardous, $locationConsent): WasteCollection {
            $existing = WasteCollection::query()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing !== null) {
                return $existing;
            }

            $collection = WasteCollection::query()->create([
                'requester_id' => $request->user()->id,
                // Wilayah selalu diturunkan dari alamat milik pengguna, bukan dari input klien.
                'region_id' => $address->region_id,
                'address_id' => $address->id,
                'request_number' => 'EV-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'address_snapshot' => [
                    'label' => $address->label,
                    'address_line' => $address->address_line,
                    'postal_code' => $address->postal_code,
                    'region_id' => $address->region_id,
                ],
                'latitude' => $locationConsent ? ($validated['latitude'] ?? $address->latitude) : null,
                'longitude' => $locationConsent ? ($validated['longitude'] ?? $address->longitude) : null,
                'location_consent_at' => $locationConsent ? now() : null,
                'method' => $validated['method'],
                'status' => CollectionStatus::Submitted,
                'contains_hazardous' => $containsHazardous,
                'hazardous_handling_status' => $containsHazardous ? 'referred' : null,
                'hazardous_partner_snapshot' => $containsHazardous ? [
                    'contact_name' => config('ecovillage.hazardous_waste.contact_name'),
                    'contact_url' => config('ecovillage.hazardous_waste.contact_url'),
                    'configured_at' => now()->toIso8601String(),
                ] : null,
                'desired_at' => $validated['desired_at'],
                'notes' => trim(($containsHazardous ? '[RUJUKAN B3 - PETUGAS BERWENANG] ' : '').($validated['notes'] ?? '')) ?: null,
                'idempotency_key' => $idempotencyKey,
                'submitted_at' => now(),
            ]);

            foreach ($validated['items'] as $item) {
                $collection->items()->create([
                    'waste_type_id' => $item['waste_type_id'],
                    'estimated_weight' => $item['estimated_weight'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            foreach ($request->file('photos', []) as $photo) {
                $path = $photo->store("collections/{$collection->id}", config('ecovillage.uploads.disk'));
                CollectionPhoto::query()->create([
                    'collection_request_id' => $collection->id,
                    'uploaded_by' => $request->user()->id,
                    'path' => $path,
                    'disk' => config('ecovillage.uploads.disk'),
                    'kind' => 'submission',
                    'mime_type' => $photo->getMimeType(),
                    'size_bytes' => $photo->getSize(),
                ]);
            }

            CollectionStatusHistory::query()->create([
                'collection_request_id' => $collection->id,
                'from_status' => null,
                'to_status' => CollectionStatus::Submitted,
                'actor_id' => $request->user()->id,
                'notes' => 'Permintaan dibuat oleh warga.',
            ]);

            AuditLog::record(
                actor: $request->user(),
                event: 'collection.submitted',
                auditable: $collection,
                after: ['status' => CollectionStatus::Submitted->value, 'contains_hazardous' => $containsHazardous],
                request: $request,
            );

            return $collection;
        });

        return to_route('collections.show', $collection)->with('success', 'Permintaan pengumpulan berhasil dikirim.');
    }

    public function show(Request $request, WasteCollection $collection): Response
    {
        $this->authorize('view', $collection);

        $collection->load([
            'items.wasteType.category',
            'photos',
            'assignments.assignee:id,name',
            'statusHistories.actor:id,name',
            'impactCalculation.factorSet',
        ]);

        $payload = $collection->toArray();
        $payload['photos'] = $collection->photos->map(fn (CollectionPhoto $photo): array => [
            ...$photo->only(['id', 'kind', 'mime_type', 'created_at']),
            'url' => URL::temporarySignedRoute('collections.photos.show', now()->addMinutes(10), ['photo' => $photo->id]),
        ]);

        $user = $request->user();
        $canProcess = $user->can('process', $collection);
        $canVerify = $user->can('verify', $collection);
        $canAssign = $user->can('assign', $collection) && $collection->status === CollectionStatus::Submitted;
        $canHandleHazardous = ! $collection->contains_hazardous
            || $user->can('collections.verify-hazardous');
        $abilities = [
            'assign' => $canAssign,
            'markPickedUp' => $canProcess
                && $canHandleHazardous
                && $collection->status === CollectionStatus::Assigned,
            'weigh' => $canProcess && $collection->status === CollectionStatus::PickedUp,
            'verify' => $canVerify && $collection->status === CollectionStatus::Weighed,
            'reject' => $canVerify && in_array($collection->status, [
                CollectionStatus::Submitted,
                CollectionStatus::Assigned,
                CollectionStatus::PickedUp,
                CollectionStatus::Weighed,
            ], true),
            'cancel' => $user->can('cancel', $collection),
        ];

        $assignees = collect();
        if ($canAssign) {
            $assigneeQuery = User::query()
                ->select(['id', 'name'])
                ->whereNull('anonymized_at')
                ->whereHas('roles', fn (Builder $query) => $query->where('name', RoleName::Officer->value))
                ->whereHas('assignedRegions', fn (Builder $query) => $query->whereIn(
                    'regions.id',
                    $collection->region->lineageIds(),
                ));

            if ($collection->contains_hazardous) {
                $assigneeQuery->where(function (Builder $query): void {
                    $query
                        ->whereHas('permissions', fn (Builder $permission) => $permission
                            ->where('name', 'collections.verify-hazardous'))
                        ->orWhereHas('roles.permissions', fn (Builder $permission) => $permission
                            ->where('name', 'collections.verify-hazardous'));
                });
            }

            $assignees = $assigneeQuery->orderBy('name')->get();
        }

        return Inertia::render('collections/show', [
            'collection' => $payload,
            'abilities' => $abilities,
            'mode' => $collection->requester_id === $user->id ? 'citizen' : 'staff',
            'assignees' => $assignees,
        ]);
    }

    public function photo(CollectionPhoto $photo): StreamedResponse
    {
        $photo->loadMissing('collectionRequest');
        $this->authorize('view', $photo->collectionRequest);

        abort_unless(Storage::disk($photo->disk)->exists($photo->path), 404);

        return Storage::disk($photo->disk)->response($photo->path, null, [
            'Content-Type' => $photo->mime_type,
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function cancel(Request $request, WasteCollection $collection): RedirectResponse
    {
        $this->authorize('cancel', $collection);
        $request->validate(['reason' => ['required', 'string', 'max:500']]);

        DB::transaction(function () use ($request, $collection): void {
            $locked = WasteCollection::query()->lockForUpdate()->findOrFail($collection->id);
            if (! in_array($locked->status, [CollectionStatus::Submitted, CollectionStatus::Assigned], true)) {
                throw ValidationException::withMessages(['status' => 'Permintaan tidak dapat dibatalkan setelah pengambilan dimulai.']);
            }

            $from = $locked->status;
            $locked->update(['status' => CollectionStatus::Cancelled, 'cancelled_at' => now()]);
            $locked->statusHistories()->create([
                'from_status' => $from,
                'to_status' => CollectionStatus::Cancelled,
                'actor_id' => $request->user()->id,
                'notes' => $request->string('reason')->toString(),
            ]);

            AuditLog::record(
                actor: $request->user(),
                event: 'collection.cancelled',
                auditable: $locked,
                before: ['status' => $from->value],
                after: ['status' => CollectionStatus::Cancelled->value],
                request: $request,
            );
        });

        return back()->with('success', 'Permintaan dibatalkan.');
    }
}

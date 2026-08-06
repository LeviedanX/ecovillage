<?php

namespace App\Http\Controllers;

use App\Enums\CollectionStatus;
use App\Models\AuditLog;
use App\Models\CollectionPhoto;
use App\Models\CollectionRequest;
use App\Models\User;
use App\Notifications\SystemNotification;
use App\Services\CollectionVerificationService;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CollectionOperationsController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(CollectionStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $status = $request->string('status')->trim()->toString();
        $search = $request->string('search')->trim()->toString();

        $query = CollectionRequest::query()->with([
            'requester:id,name',
            'region:id,name,level',
            'items.wasteType.category',
            'activeAssignment.assignee:id,name',
        ])
            ->when($status !== '', fn (Builder $builder) => $builder->where('status', $status))
            ->when($search !== '', fn (Builder $builder) => $builder->where(function (Builder $searchQuery) use ($search): void {
                $searchQuery
                    ->where('request_number', 'like', "%{$search}%")
                    ->orWhereHas('requester', fn (Builder $requester) => $requester->where('name', 'like', "%{$search}%"));
            }));

        if ($request->user()->can('collections.view-assigned') && ! $request->user()->can('collections.view-region')) {
            $query->whereHas('assignments', fn (Builder $assignment) => $assignment
                ->where('assignee_id', $request->user()->id)
                ->where('is_active', true));
        } elseif (! $request->user()->hasRole('super-admin')) {
            $query->whereIn('region_id', $request->user()->accessibleRegionIds());
        }

        return Inertia::render('collections/index', [
            'collections' => $query->latest('desired_at')->paginate(20)->withQueryString(),
            'mode' => 'operations',
            'filters' => compact('status', 'search'),
        ]);
    }

    public function assign(Request $request, CollectionRequest $collection): RedirectResponse
    {
        $this->authorize('assign', $collection);
        $validated = $request->validate([
            'assignee_id' => ['required', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $assignee = User::query()->with(['roles', 'assignedRegions'])->findOrFail($request->integer('assignee_id'));
        if (! $assignee->hasRole('kader') || ! $assignee->canAccessRegion($collection->region)) {
            throw ValidationException::withMessages(['assignee_id' => 'Kader tidak memiliki penugasan pada wilayah permintaan ini.']);
        }
        if ($collection->contains_hazardous && ! $assignee->hasPermissionTo('collections.verify-hazardous')) {
            throw ValidationException::withMessages([
                'assignee_id' => 'Permintaan B3 hanya dapat ditugaskan kepada kader dengan kewenangan B3.',
            ]);
        }

        DB::transaction(function () use ($request, $collection, $assignee, $validated): void {
            $locked = CollectionRequest::query()->lockForUpdate()->findOrFail($collection->id);
            if ($locked->status !== CollectionStatus::Submitted) {
                throw ValidationException::withMessages(['status' => 'Hanya permintaan berstatus diajukan yang dapat ditugaskan.']);
            }

            $locked->assignments()->where('is_active', true)->update(['is_active' => false, 'completed_at' => now()]);
            $locked->assignments()->create([
                'assignee_id' => $assignee->id,
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
                'is_active' => true,
            ]);
            $this->transition($locked, CollectionStatus::Assigned, $request->user(), $validated['notes'] ?? 'Petugas ditugaskan.');

            AuditLog::record(
                actor: $request->user(),
                event: 'collection.assigned',
                auditable: $locked,
                after: ['status' => CollectionStatus::Assigned->value, 'assignee_id' => $assignee->id],
                request: $request,
            );

            DB::afterCommit(function () use ($assignee, $locked): void {
                $assignee->notify(new SystemNotification(
                    title: 'Tugas pengumpulan baru',
                    message: "Anda ditugaskan menangani {$locked->request_number}.",
                    href: "/pengumpulan/{$locked->id}",
                    kind: 'assignment',
                ));
            });
        });

        return back()->with('success', 'Kader berhasil ditugaskan.');
    }

    public function pickedUp(Request $request, CollectionRequest $collection): RedirectResponse
    {
        $this->authorize('process', $collection);
        $request->validate(['notes' => ['nullable', 'string', 'max:500']]);

        if ($collection->items()->whereHas('wasteType.category', fn (Builder $query) => $query->where('is_hazardous', true))->exists()
            && ! $request->user()->can('collections.verify-hazardous')) {
            throw new AuthorizationException('Pengambilan B3 hanya dapat dilakukan petugas berwenang.');
        }

        DB::transaction(function () use ($request, $collection): void {
            $locked = CollectionRequest::query()->lockForUpdate()->findOrFail($collection->id);
            $this->transition($locked, CollectionStatus::PickedUp, $request->user(), $request->string('notes')->toString() ?: 'Sampah telah diambil.');
            if ($locked->contains_hazardous) {
                $locked->update(['hazardous_handling_status' => 'collected_by_authorized_officer']);
            }

            AuditLog::record(
                actor: $request->user(),
                event: 'collection.picked-up',
                auditable: $locked,
                after: [
                    'status' => CollectionStatus::PickedUp->value,
                    'hazardous_handling_status' => $locked->hazardous_handling_status,
                ],
                request: $request,
            );
        });

        return back()->with('success', 'Status diperbarui menjadi telah diambil.');
    }

    public function weigh(Request $request, CollectionRequest $collection): RedirectResponse
    {
        $this->authorize('process', $collection);
        $validated = $request->validate([
            'weights' => ['required', 'array', 'min:1', 'max:20'],
            'weights.*' => ['required', 'numeric', 'gt:0', 'max:10000', 'decimal:0,3'],
            'proof' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('ecovillage.uploads.max_image_kilobytes'))],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($request, $collection, $validated): void {
            $locked = CollectionRequest::query()->lockForUpdate()->findOrFail($collection->id);
            if ($locked->status !== CollectionStatus::PickedUp) {
                throw ValidationException::withMessages(['status' => 'Penimbangan hanya dapat dilakukan setelah pengambilan.']);
            }

            $items = $locked->items()->lockForUpdate()->get();
            $expected = $items->pluck('id')->map(fn ($id) => (string) $id)->sort()->values();
            $provided = collect(array_keys($validated['weights']))->map(fn ($id) => (string) $id)->sort()->values();
            if ($expected->all() !== $provided->all()) {
                throw ValidationException::withMessages(['weights' => 'Berat wajib diisi tepat satu kali untuk setiap item.']);
            }

            foreach ($items as $item) {
                $item->update([
                    'verified_weight' => $validated['weights'][$item->id],
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                ]);
            }

            if ($request->hasFile('proof')) {
                $photo = $request->file('proof');
                CollectionPhoto::query()->create([
                    'collection_request_id' => $locked->id,
                    'uploaded_by' => $request->user()->id,
                    'kind' => 'pickup_proof',
                    'disk' => config('ecovillage.uploads.disk'),
                    'path' => $photo->store("collections/{$locked->id}", config('ecovillage.uploads.disk')),
                    'mime_type' => $photo->getMimeType(),
                    'size_bytes' => $photo->getSize(),
                ]);
            }

            $this->transition($locked, CollectionStatus::Weighed, $request->user(), $validated['notes'] ?? 'Hasil penimbangan dicatat.');
        });

        return back()->with('success', 'Hasil penimbangan tersimpan dan menunggu verifikasi pengelola.');
    }

    public function verify(
        Request $request,
        CollectionRequest $collection,
        CollectionVerificationService $verification,
    ): RedirectResponse {
        $this->authorize('verify', $collection);
        $request->validate(['weights' => ['sometimes', 'array'], 'weights.*' => ['numeric', 'gt:0', 'max:10000']]);
        $weights = $request->input('weights', $collection->items()->pluck('verified_weight', 'id')->all());

        try {
            $verification->verify($collection, $request->user(), $weights);
        } catch (DomainException $exception) {
            throw ValidationException::withMessages(['verification' => $exception->getMessage()]);
        }

        return back()->with('success', 'Permintaan diverifikasi; poin dan estimasi dampak telah dicatat.');
    }

    public function reject(Request $request, CollectionRequest $collection): RedirectResponse
    {
        $this->authorize('verify', $collection);
        $validated = $request->validate(['reason' => ['required', 'string', 'min:10', 'max:1000']]);

        DB::transaction(function () use ($request, $collection, $validated): void {
            $locked = CollectionRequest::query()->lockForUpdate()->findOrFail($collection->id);
            $this->transition($locked, CollectionStatus::Rejected, $request->user(), $validated['reason']);
            $locked->update(['rejected_at' => now()]);
            AuditLog::record(
                actor: $request->user(),
                event: 'collection.rejected',
                auditable: $locked,
                after: ['status' => CollectionStatus::Rejected->value, 'reason' => $validated['reason']],
                request: $request,
            );
        });

        return back()->with('success', 'Permintaan ditolak dengan alasan tercatat.');
    }

    public function map(Request $request): Response
    {
        $query = CollectionRequest::query()
            ->with('region:id,name')
            ->withSum('items', 'estimated_weight')
            ->whereNotIn('status', [CollectionStatus::Completed, CollectionStatus::Cancelled, CollectionStatus::Rejected])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        if ($request->user()->can('map.view-exact-assigned') && ! $request->user()->can('map.view-exact-region')) {
            $query->whereHas('assignments', fn (Builder $assignment) => $assignment
                ->where('assignee_id', $request->user()->id)
                ->where('is_active', true));
        } elseif (! $request->user()->hasRole('super-admin')) {
            $query->whereIn('region_id', $request->user()->accessibleRegionIds());
        }

        return Inertia::render('public/map', [
            'internal' => true,
            'points' => $query->get()->map(fn (CollectionRequest $item): array => [
                'id' => $item->id,
                'latitude' => (float) $item->latitude,
                'longitude' => (float) $item->longitude,
                'region_name' => $item->region->name,
                'status' => $item->status->value,
                'scheduled_at' => $item->desired_at,
                'category' => 'tugas',
                'weight_kg' => (float) $item->getAttribute('items_sum_estimated_weight'),
            ]),
            'mapStyleUrl' => config('ecovillage.map.style_url'),
        ]);
    }

    private function transition(CollectionRequest $request, CollectionStatus $next, User $actor, ?string $notes = null): void
    {
        $current = $request->status;
        if (! $current->canTransitionTo($next)) {
            throw ValidationException::withMessages(['status' => "Transisi {$current->value} ke {$next->value} tidak diizinkan."]);
        }

        $request->statusHistories()->create([
            'from_status' => $current,
            'to_status' => $next,
            'actor_id' => $actor->id,
            'notes' => $notes,
        ]);
        $request->update(['status' => $next]);
        $request->refresh();
    }
}

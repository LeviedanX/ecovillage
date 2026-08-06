<?php

namespace App\Http\Controllers;

use App\Enums\ContentReportStatus;
use App\Enums\ForumContentStatus;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\CollectionRequest;
use App\Models\ContentReport;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\PointTransaction;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\PointLedgerService;
use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    public function adjustPoints(Request $request, User $user, PointLedgerService $ledger): RedirectResponse
    {
        abort_unless($request->user()->can('points.adjust'), 403);
        $this->ensureTargetRegion($request->user(), $user);
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'not_in:0', 'between:-1000000,1000000'],
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
            'idempotency_key' => ['required', 'string', 'max:100'],
        ]);

        try {
            $ledger->adjust($user, $validated['amount'], $validated['reason'], $request->user(), $validated['idempotency_key']);
        } catch (DomainException $exception) {
            throw ValidationException::withMessages(['adjustment' => $exception->getMessage()]);
        }

        return back()->with('success', 'Penyesuaian poin dicatat di ledger.');
    }

    public function reversePoints(Request $request, PointTransaction $transaction, PointLedgerService $ledger): RedirectResponse
    {
        abort_unless($request->user()->can('points.adjust'), 403);
        $this->ensureTargetRegion($request->user(), $transaction->user);
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
            'idempotency_key' => ['required', 'string', 'max:100'],
        ]);

        try {
            $ledger->reverse($transaction, $validated['reason'], $request->user(), $validated['idempotency_key']);
        } catch (DomainException $exception) {
            throw ValidationException::withMessages(['reversal' => $exception->getMessage()]);
        }

        return back()->with('success', 'Reversal poin berhasil dicatat.');
    }

    public function moderate(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('forum.moderate'), 403);
        $validated = $request->validate([
            'type' => ['required', Rule::in(['thread', 'post'])],
            'id' => ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::enum(ForumContentStatus::class)],
            'is_locked' => ['sometimes', 'boolean'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        if ($request->string('type')->toString() === 'thread') {
            $content = ForumThread::query()->with(['space.region', 'space.program.region'])->findOrFail($request->integer('id'));
            $space = $content->space;
        } else {
            $content = ForumPost::query()->with(['thread.space.region', 'thread.space.program.region'])->findOrFail($request->integer('id'));
            $space = $content->thread->space;
        }
        $this->authorize('moderate', $space);
        $before = $content->only(['status', 'is_locked']);
        $updates = [
            'status' => $validated['status'],
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ];
        if ($content instanceof ForumThread && array_key_exists('is_locked', $validated)) {
            $updates['is_locked'] = $validated['is_locked'];
        }
        $content->update($updates);

        AuditLog::record(
            actor: $request->user(),
            event: 'forum.content.moderated',
            auditable: $content,
            before: $before,
            after: [...$content->only(['status', 'is_locked']), 'reason' => $validated['reason']],
            request: $request,
        );

        return back()->with('success', 'Konten forum telah dimoderasi.');
    }

    public function resolveReport(Request $request, ContentReport $report): RedirectResponse
    {
        abort_unless($request->user()->can('forum.moderate'), 403);
        $reportable = $report->reportable;

        if ($reportable instanceof ForumThread) {
            $reportable->loadMissing(['space.region', 'space.program.region']);
            $space = $reportable->space;
        } elseif ($reportable instanceof ForumPost) {
            $reportable->loadMissing(['thread.space.region', 'thread.space.program.region']);
            $space = $reportable->thread->space;
        } else {
            abort(404);
        }

        $this->authorize('moderate', $space);
        $validated = $request->validate([
            'status' => ['required', Rule::in([ContentReportStatus::Resolved->value, ContentReportStatus::Dismissed->value])],
            'resolution_notes' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        $report->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'resolution_notes' => $validated['resolution_notes'],
        ]);

        AuditLog::record(
            actor: $request->user(),
            event: 'content-report.resolved',
            auditable: $report,
            after: ['status' => $validated['status']],
            request: $request,
        );

        return back()->with('success', 'Laporan konten diselesaikan.');
    }

    public function updateSetting(Request $request, SiteSetting $setting): RedirectResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403);
        $validated = $request->validate([
            'value' => ['present'],
            'is_public' => ['sometimes', 'boolean'],
        ]);
        $before = $setting->only(['value', 'is_public']);
        $setting->update([
            'value' => $validated['value'],
            'is_public' => $validated['is_public'] ?? $setting->is_public,
            'updated_by' => $request->user()->id,
        ]);
        AuditLog::record(
            actor: $request->user(),
            event: 'site-setting.updated',
            auditable: $setting,
            before: $before,
            after: $setting->only(['value', 'is_public']),
            request: $request,
        );
        Cache::forget('public.home.v1');

        return back()->with('success', 'Pengaturan situs diperbarui.');
    }

    public function assignRole(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        $validated = $request->validate(['role' => ['required', Rule::enum(RoleName::class)]]);
        $role = RoleName::from($validated['role']);

        if ($user->hasRole(RoleName::SuperAdmin->value)
            && $role !== RoleName::SuperAdmin
            && User::role(RoleName::SuperAdmin->value)->count() <= 1) {
            throw ValidationException::withMessages(['role' => 'Super admin terakhir tidak boleh diturunkan.']);
        }

        // Invariant: super admin bersifat tunggal. Promosi hanya sah bila belum
        // ada pemegang lain, sehingga eskalasi wajib melalui penurunan eksplisit.
        if ($role === RoleName::SuperAdmin
            && User::role(RoleName::SuperAdmin->value)->whereKeyNot($user->getKey())->exists()) {
            throw ValidationException::withMessages(['role' => 'Super admin hanya boleh satu akun.']);
        }

        $before = $user->getRoleNames()->values()->all();
        $user->syncRoles([Role::findOrCreate($role->value, 'web')]);
        AuditLog::record(
            actor: $request->user(),
            event: 'user.role.changed',
            auditable: $user,
            before: ['roles' => $before],
            after: ['roles' => [$role->value]],
            request: $request,
        );

        return back()->with('success', 'Role pengguna diperbarui.');
    }

    public function exportCollections(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('collections.export') || $request->user()->can('reports.export'), 403);
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', 'string', 'max:30'],
        ]);

        $query = CollectionRequest::query()
            ->with(['region:id,name', 'requester:id,name'])
            ->withSum('items', 'verified_weight')
            ->when(isset($filters['from']), fn (Builder $builder) => $builder->whereDate('created_at', '>=', $filters['from']))
            ->when(isset($filters['to']), fn (Builder $builder) => $builder->whereDate('created_at', '<=', $filters['to']))
            ->when(isset($filters['status']), fn (Builder $builder) => $builder->where('status', $filters['status']))
            ->orderBy('id');

        if (! $request->user()->hasRole(RoleName::SuperAdmin->value)) {
            $query->whereIn('region_id', $request->user()->accessibleRegionIds());
        }

        AuditLog::record(
            actor: $request->user(),
            event: 'collections.exported',
            metadata: ['filters' => $filters],
            request: $request,
        );

        return response()->streamDownload(function () use ($query): void {
            $stream = fopen('php://output', 'wb');

            if ($stream === false) {
                throw new RuntimeException('Aliran ekspor CSV tidak dapat dibuka.');
            }

            fputcsv($stream, ['Nomor', 'Wilayah', 'Warga', 'Status', 'Metode', 'Jadwal', 'Berat terverifikasi (kg)', 'Selesai']);
            $query->chunkById(500, function ($collections) use ($stream): void {
                foreach ($collections as $collection) {
                    fputcsv($stream, array_map($this->safeCsv(...), [
                        $collection->request_number,
                        $collection->region->name,
                        $collection->requester?->name,
                        $collection->status->value,
                        $collection->method->value,
                        $collection->desired_at?->toIso8601String(),
                        $collection->getAttribute('items_sum_verified_weight'),
                        $collection->completed_at?->toIso8601String(),
                    ]));
                }
            });
            fclose($stream);
        }, 'ecovillage-collections-'.now()->format('Ymd-His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function ensureTargetRegion(User $actor, User $target): void
    {
        if ($actor->hasRole(RoleName::SuperAdmin->value)) {
            return;
        }

        abort_unless($target->profile?->primaryRegion !== null && $actor->canAccessRegion($target->profile->primaryRegion), 403);
    }

    private function safeCsv(mixed $value): string
    {
        $string = (string) ($value ?? '');

        return preg_match('/^[=+\-@]/', $string) === 1 ? "'{$string}" : $string;
    }
}

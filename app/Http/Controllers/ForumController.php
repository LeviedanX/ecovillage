<?php

namespace App\Http\Controllers;

use App\Enums\ContentReportStatus;
use App\Enums\ForumContentStatus;
use App\Http\Requests\StoreForumPostRequest;
use App\Http\Requests\StoreForumThreadRequest;
use App\Models\AuditLog;
use App\Models\ContentReport;
use App\Models\ForumPost;
use App\Models\ForumSpace;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ForumController extends Controller
{
    public function index(Request $request): Response
    {
        $request->user()->loadMissing('programRegistrations:id,user_id,program_id,status');
        $spaces = $this->accessibleSpaces($request->user());
        $spaceIds = $spaces->pluck('id');
        $search = trim((string) $request->string('search'));

        $threads = ForumThread::query()
            ->with(['space:id,name,slug,region_id', 'user:id,name'])
            ->withCount('posts')
            ->whereIn('forum_space_id', $spaceIds)
            ->where(function (Builder $query) use ($request): void {
                $query->where('status', ForumContentStatus::Visible)
                    ->orWhere('user_id', $request->user()->id);
            })
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $nested) use ($search): void {
                $nested->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            }))
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('forum/index', [
            'spaces' => $spaces->values(),
            'threads' => $threads,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(StoreForumThreadRequest $request): RedirectResponse
    {
        $space = ForumSpace::query()->with(['region', 'program.region'])->findOrFail($request->integer('forum_space_id'));
        $this->authorize('createThread', $space);

        $thread = ForumThread::query()->create([
            'forum_space_id' => $space->id,
            'user_id' => $request->user()->id,
            'title' => $request->string('title')->trim()->toString(),
            'slug' => Str::slug($request->string('title')->toString()).'-'.Str::lower(Str::random(6)),
            'body' => $request->string('body')->trim()->toString(),
            'status' => ForumContentStatus::Pending,
            'is_locked' => false,
        ]);

        AuditLog::record(
            actor: $request->user(),
            event: 'forum.thread.created',
            auditable: $thread,
            after: ['status' => ForumContentStatus::Pending->value, 'space_id' => $space->id],
            request: $request,
        );

        return to_route('forum.show', $thread)->with('success', 'Topik dikirim dan menunggu moderasi.');
    }

    public function show(Request $request, ForumThread $thread): Response
    {
        $thread->load(['space.region', 'space.program.region', 'user:id,name']);
        $this->authorize('view', $thread->space);
        abort_unless(
            $thread->status === ForumContentStatus::Visible
                || $thread->user_id === $request->user()->id
                || $request->user()->can('forum.moderate'),
            404,
        );

        $posts = $thread->posts()
            ->with(['user:id,name', 'parent:id,user_id'])
            ->where(function (Builder $query) use ($request): void {
                $query->where('status', ForumContentStatus::Visible)
                    ->orWhere('user_id', $request->user()->id);
            })
            ->oldest()
            ->paginate(30);

        return Inertia::render('forum/show', compact('thread', 'posts'));
    }

    public function reply(StoreForumPostRequest $request, ForumThread $thread): RedirectResponse
    {
        $thread->load(['space.region', 'space.program.region']);
        $this->authorize('createThread', $thread->space);
        if ($thread->is_locked) {
            throw ValidationException::withMessages(['thread' => 'Topik ini telah dikunci moderator.']);
        }

        if ($request->filled('parent_id')) {
            abort_unless($thread->posts()->whereKey($request->integer('parent_id'))->exists(), 422);
        }

        $post = $thread->posts()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $request->integer('parent_id') ?: null,
            'body' => $request->string('body')->trim()->toString(),
            'status' => ForumContentStatus::Pending,
        ]);

        AuditLog::record(
            actor: $request->user(),
            event: 'forum.post.created',
            auditable: $post,
            after: ['status' => ForumContentStatus::Pending->value],
            request: $request,
        );

        return back()->with('success', 'Balasan dikirim dan menunggu moderasi.');
    }

    public function report(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['thread', 'post'])],
            'id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($request->string('type')->toString() === 'thread') {
            $reportable = ForumThread::query()->with(['space.region', 'space.program.region'])->findOrFail($request->integer('id'));
            $space = $reportable->space;
        } else {
            $reportable = ForumPost::query()->with(['thread.space.region', 'thread.space.program.region'])->findOrFail($request->integer('id'));
            $space = $reportable->thread->space;
        }
        $this->authorize('view', $space);

        ContentReport::query()->create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => $reportable::class,
            'reportable_id' => $reportable->id,
            'reason' => $validated['reason'],
            'description' => $validated['description'] ?? null,
            'status' => ContentReportStatus::Pending,
        ]);

        return back()->with('success', 'Laporan diterima untuk ditinjau moderator.');
    }

    /** @return Collection<int, ForumSpace> */
    private function accessibleSpaces(User $user): Collection
    {
        return ForumSpace::query()
            ->with(['region:id,parent_id,name,level', 'program.region:id,parent_id,name,level'])
            ->where('is_active', true)
            ->get()
            ->filter(fn (ForumSpace $space) => $user->can('view', $space));
    }
}

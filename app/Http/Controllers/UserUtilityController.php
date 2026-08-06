<?php

namespace App\Http\Controllers;

use App\Enums\ContentStatus;
use App\Enums\ForumContentStatus;
use App\Enums\ProgramStatus;
use App\Enums\RoleName;
use App\Models\CollectionRequest;
use App\Models\EducationContent;
use App\Models\ForumSpace;
use App\Models\ForumThread;
use App\Models\Product;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class UserUtilityController extends Controller
{
    public function search(Request $request): Response
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $query = trim((string) ($validated['q'] ?? ''));

        if (mb_strlen($query) < 2) {
            return Inertia::render('utilities/search', [
                'query' => $query,
                'results' => $this->emptySearchResults(),
            ]);
        }

        $user = $request->user();

        return Inertia::render('utilities/search', [
            'query' => $query,
            'results' => [
                'collections' => $this->searchCollections($user, $query),
                'education' => EducationContent::query()
                    ->where('status', ContentStatus::Published)
                    ->where(function (Builder $builder) use ($query): void {
                        $builder->where('title', 'like', "%{$query}%")
                            ->orWhere('excerpt', 'like', "%{$query}%");
                    })
                    ->latest('published_at')
                    ->limit(6)
                    ->get(['title', 'slug', 'excerpt'])
                    ->map(fn (EducationContent $content): array => [
                        'title' => $content->title,
                        'description' => $content->excerpt,
                        'href' => "/edukasi/{$content->slug}",
                    ]),
                'programs' => Program::query()
                    ->whereIn('status', [
                        ProgramStatus::Published,
                        ProgramStatus::RegistrationOpen,
                        ProgramStatus::RegistrationClosed,
                        ProgramStatus::Completed,
                    ])
                    ->where(function (Builder $builder) use ($query): void {
                        $builder->where('title', 'like', "%{$query}%")
                            ->orWhere('description', 'like', "%{$query}%");
                    })
                    ->latest('starts_at')
                    ->limit(6)
                    ->get(['title', 'slug', 'description'])
                    ->map(fn (Program $program): array => [
                        'title' => $program->title,
                        'description' => str($program->description)->limit(140)->toString(),
                        'href' => "/kegiatan/{$program->slug}",
                    ]),
                'products' => Product::query()
                    ->where('is_active', true)
                    ->where(function (Builder $builder) use ($query): void {
                        $builder->where('name', 'like', "%{$query}%")
                            ->orWhere('description', 'like', "%{$query}%");
                    })
                    ->orderBy('name')
                    ->limit(6)
                    ->get(['name', 'slug', 'description', 'point_price'])
                    ->map(fn (Product $product): array => [
                        'title' => $product->name,
                        'description' => str((string) $product->description)->limit(140)->toString(),
                        'href' => '/marketplace',
                        'meta' => number_format($product->point_price, 0, ',', '.').' poin',
                    ]),
                'forum' => $this->searchForum($user, $query),
            ],
        ]);
    }

    public function notifications(Request $request): Response
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(20)
            ->through(fn (DatabaseNotification $notification): array => [
                'id' => $notification->id,
                'title' => (string) ($notification->data['title'] ?? 'Pemberitahuan'),
                'message' => (string) ($notification->data['message'] ?? ''),
                'href' => $this->safeNotificationHref($notification->data['href'] ?? null),
                'kind' => (string) ($notification->data['kind'] ?? 'info'),
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ]);

        return Inertia::render('utilities/notifications', [
            'notifications' => $notifications,
        ]);
    }

    public function readNotification(Request $request, string $notification): RedirectResponse
    {
        $ownedNotification = $request->user()->notifications()->find($notification);

        if (! $ownedNotification instanceof DatabaseNotification) {
            abort(404);
        }

        $ownedNotification->markAsRead();

        return back()->with('success', 'Notifikasi ditandai sudah dibaca.');
    }

    public function readAllNotifications(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back()->with('success', 'Semua notifikasi ditandai sudah dibaca.');
    }

    /** @return array<string, Collection<int, array<string, mixed>>> */
    private function emptySearchResults(): array
    {
        return [
            'collections' => collect(),
            'education' => collect(),
            'programs' => collect(),
            'products' => collect(),
            'forum' => collect(),
        ];
    }

    /** @return list<array{title: string, description: string, href: string, meta: string|null}> */
    private function searchCollections(User $user, string $query): array
    {
        $builder = CollectionRequest::query()
            ->with('region:id,name')
            ->where(function (Builder $nested) use ($query): void {
                $nested->where('request_number', 'like', "%{$query}%")
                    ->orWhere('notes', 'like', "%{$query}%");
            });

        if ($user->can('collections.view-region')) {
            if (! $user->hasRole(RoleName::SuperAdmin->value)) {
                $builder->whereIn('region_id', $user->accessibleRegionIds());
            }
        } elseif ($user->can('collections.view-assigned')) {
            $builder->whereHas('assignments', fn (Builder $assignment) => $assignment
                ->where('assignee_id', $user->id)
                ->where('is_active', true));
        } else {
            $builder->where('requester_id', $user->id);
        }

        return array_values($builder->latest()->limit(6)->get()
            ->map(fn (CollectionRequest $collection): array => $this->searchResult(
                $collection->request_number,
                $collection->region->name,
                "/pengumpulan/{$collection->id}",
                $collection->status->value,
            ))
            ->all());
    }

    /** @return list<array{title: string, description: string, href: string, meta: string|null}> */
    private function searchForum(User $user, string $query): array
    {
        $user->loadMissing('programRegistrations:id,user_id,program_id,status');
        $spaceIds = ForumSpace::query()
            ->with(['region:id,parent_id,name,level', 'program.region:id,parent_id,name,level'])
            ->where('is_active', true)
            ->get()
            ->filter(fn (ForumSpace $space): bool => $user->can('view', $space))
            ->pluck('id');

        return array_values(ForumThread::query()
            ->whereIn('forum_space_id', $spaceIds)
            ->where(function (Builder $visibility) use ($user): void {
                $visibility->where('status', ForumContentStatus::Visible)
                    ->orWhere('user_id', $user->id);
            })
            ->where(function (Builder $builder) use ($query): void {
                $builder->where('title', 'like', "%{$query}%")
                    ->orWhere('body', 'like', "%{$query}%");
            })
            ->latest('updated_at')
            ->limit(6)
            ->get(['id', 'title', 'body', 'updated_at'])
            ->map(fn (ForumThread $thread): array => $this->searchResult(
                $thread->title,
                str($thread->body)->limit(140)->toString(),
                "/forum/{$thread->id}",
                $thread->updated_at?->diffForHumans(),
            ))
            ->all());
    }

    /** @return array{title: string, description: string, href: string, meta: string|null} */
    private function searchResult(string $title, string $description, string $href, ?string $meta): array
    {
        return compact('title', 'description', 'href', 'meta');
    }

    private function safeNotificationHref(mixed $href): string
    {
        if (! is_string($href) || ! str_starts_with($href, '/') || str_starts_with($href, '//')) {
            return '/dashboard';
        }

        if (str_contains($href, "\n") || str_contains($href, "\r")) {
            return '/dashboard';
        }

        return $href;
    }
}

import { Form, Head, Link } from '@inertiajs/react';
import {
    Lock,
    MessageCircle,
    MessageSquareText,
    Pin,
    Plus,
    Search,
    UsersRound,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatNumber } from '@/lib/ecovillage';
import type { ForumSpace, ForumThread, Paginated } from '@/types';

type Props = {
    spaces?: ForumSpace[];
    threads?: Paginated<ForumThread> | ForumThread[];
    filters?: { search?: string; space?: string };
};

export default function ForumIndex({
    spaces = [],
    threads = [],
    filters = {},
}: Props) {
    const items = Array.isArray(threads) ? threads : threads.data;
    const pagination = Array.isArray(threads) ? null : threads;

    return (
        <>
            <Head title="Forum Komunitas" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Forum warga"
                    description="Bertukar pengalaman berdasarkan wilayah dan program. Forum ini bukan chat realtime."
                    action={
                        <Button asChild>
                            <a href="#topik-baru">
                                <Plus aria-hidden="true" />
                                Buat topik
                            </a>
                        </Button>
                    }
                />
                {spaces.length > 0 && (
                    <section>
                        <h2 className="sr-only">Ruang forum</h2>
                        <div
                            className="flex snap-x gap-3 overflow-x-auto pb-2"
                            data-reveal-group="right"
                            data-reveal-distance="sm"
                            data-reveal-step="55"
                        >
                            {spaces.map((space) => (
                                <Link
                                    key={space.id}
                                    href={`/forum?space=${space.slug}`}
                                    className="eco-card flex min-w-60 snap-start items-center gap-3 p-4 hover:border-primary/35"
                                >
                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                        <UsersRound
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {space.name}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatNumber(
                                                space.threads_count || 0,
                                                0,
                                            )}{' '}
                                            topik{' '}
                                            {space.is_private
                                                ? '· terbatas'
                                                : ''}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
                <section id="topik-baru" className="eco-card p-5 sm:p-6">
                    <h2 className="text-lg font-semibold">Buat topik baru</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Topik baru menunggu moderasi sebelum tampil untuk warga
                        lain.
                    </p>
                    <Form
                        action="/forum"
                        method="post"
                        resetOnSuccess={['title', 'body']}
                        className="mt-5"
                    >
                        {({ processing, errors }) => (
                            <div className="grid gap-4">
                                <label className="grid gap-2 text-sm font-medium">
                                    Ruang forum
                                    <select
                                        name="forum_space_id"
                                        required
                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                    >
                                        <option value="">Pilih ruang</option>
                                        {spaces.map((space) => (
                                            <option
                                                key={space.id}
                                                value={space.id}
                                            >
                                                {space.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.forum_space_id && (
                                        <span className="text-xs text-destructive">
                                            {errors.forum_space_id}
                                        </span>
                                    )}
                                </label>
                                <label className="grid gap-2 text-sm font-medium">
                                    Judul
                                    <Input
                                        name="title"
                                        required
                                        maxLength={160}
                                        placeholder="Tulis judul yang jelas"
                                    />
                                    {errors.title && (
                                        <span className="text-xs text-destructive">
                                            {errors.title}
                                        </span>
                                    )}
                                </label>
                                <label className="grid gap-2 text-sm font-medium">
                                    Isi diskusi
                                    <textarea
                                        name="body"
                                        required
                                        maxLength={10000}
                                        rows={5}
                                        className="rounded-xl border bg-background px-3 py-2 text-sm"
                                        placeholder="Jelaskan konteks atau pertanyaan Anda."
                                    />
                                    {errors.body && (
                                        <span className="text-xs text-destructive">
                                            {errors.body}
                                        </span>
                                    )}
                                </label>
                                <Button
                                    type="submit"
                                    className="w-fit"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}Kirim topik
                                </Button>
                            </div>
                        )}
                    </Form>
                </section>
                <form
                    action="/forum"
                    method="get"
                    role="search"
                    className="eco-card flex gap-3 p-4"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="relative flex-1">
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Cari topik atau isi diskusi"
                            className="pl-9"
                            aria-label="Cari forum"
                        />
                    </div>
                    {filters.space && (
                        <input
                            type="hidden"
                            name="space"
                            value={filters.space}
                        />
                    )}
                    <Button type="submit" variant="secondary">
                        Cari
                    </Button>
                </form>
                <section
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="border-b px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-semibold">
                            Diskusi terbaru
                        </h2>
                    </div>
                    {items.length > 0 ? (
                        <div
                            className="divide-y"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {items.map((thread) => (
                                <ThreadRow key={thread.id} thread={thread} />
                            ))}
                        </div>
                    ) : (
                        <div className="p-5 sm:p-6">
                            <EmptyState
                                icon={MessageSquareText}
                                title="Belum ada topik"
                                description="Mulai diskusi yang relevan untuk wilayah atau program Anda."
                            />
                        </div>
                    )}
                </section>
                {pagination && (
                    <PaginationLinks
                        currentPage={pagination.current_page}
                        lastPage={pagination.last_page}
                        baseUrl="/forum"
                    />
                )}
            </div>
        </>
    );
}
function ThreadRow({ thread }: { thread: ForumThread }) {
    return (
        <Link
            href={`/forum/${thread.id}`}
            className="flex gap-4 px-5 py-4 hover:bg-muted/40 sm:px-6"
        >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">
                        {thread.title}
                    </h3>
                    {thread.is_pinned && (
                        <Pin
                            className="size-3.5 shrink-0 text-primary"
                            aria-label="Disematkan"
                        />
                    )}
                    {thread.is_locked && (
                        <Lock
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Dikunci"
                        />
                    )}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {thread.excerpt ||
                        thread.body ||
                        `Dibuat oleh ${thread.author_name || thread.user?.name || 'Warga'}`}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                    {thread.space_name ||
                        thread.space?.name ||
                        'Ruang komunitas'}{' '}
                    · {thread.replies_count ?? thread.posts_count ?? 0} balasan
                    · diperbarui {formatDate(thread.updated_at, true)}
                </p>
            </div>
        </Link>
    );
}
ForumIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Forum', href: '/forum' },
    ],
};

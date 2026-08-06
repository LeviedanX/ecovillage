import { Form, Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Flag,
    Lock,
    MessageCircle,
    Send,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/lib/ecovillage';
import type { ForumPost, ForumThread, Paginated } from '@/types';

type ThreadDetail = ForumThread & { body?: string };
export default function ForumShow({
    thread,
    posts = [],
}: {
    thread: ThreadDetail;
    posts?: Paginated<ForumPost> | ForumPost[];
}) {
    const items = Array.isArray(posts) ? posts : posts.data;
    const pagination = Array.isArray(posts) ? null : posts;
    const threadUrl = `/forum/${thread.id}`;
    const threadAuthor = thread.author_name || thread.user?.name || 'Warga';
    const replyCount =
        thread.replies_count ?? thread.posts_count ?? items.length;

    return (
        <>
            <Head title={thread.title} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="-ml-3 w-fit"
                >
                    <Link href="/forum">
                        <ArrowLeft aria-hidden="true" />
                        Kembali ke forum
                    </Link>
                </Button>
                <article
                    className="eco-card p-5 sm:p-7"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">
                            {thread.space_name ||
                                thread.space?.name ||
                                'Ruang komunitas'}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{threadAuthor}</span>
                        <span aria-hidden="true">•</span>
                        <time dateTime={thread.updated_at}>
                            {formatDate(thread.updated_at, true)}
                        </time>
                        {thread.is_locked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-semibold">
                                <Lock className="size-3" aria-hidden="true" />
                                Dikunci
                            </span>
                        )}
                    </div>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                        {thread.title}
                    </h1>
                    {thread.body && (
                        <div className="mt-5 text-sm leading-7 whitespace-pre-wrap text-foreground/90">
                            {thread.body}
                        </div>
                    )}
                    <Form
                        action="/forum/laporkan"
                        method="post"
                        className="mt-6 border-t pt-4"
                    >
                        <input type="hidden" name="type" value="thread" />
                        <input type="hidden" name="id" value={thread.id} />
                        <input
                            type="hidden"
                            name="reason"
                            value="needs_review"
                        />
                        <Button type="submit" variant="ghost" size="sm">
                            <Flag aria-hidden="true" />
                            Laporkan untuk ditinjau
                        </Button>
                    </Form>
                </article>
                <section
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="border-b px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-semibold">
                            {replyCount} balasan
                        </h2>
                    </div>
                    {items.length > 0 ? (
                        <div
                            className="divide-y"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {items.map((post) => {
                                const authorName =
                                    post.author_name ||
                                    post.user?.name ||
                                    'Warga';

                                return (
                                    <article
                                        key={post.id}
                                        className="px-5 py-5 sm:px-6"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                                                {authorName
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {authorName}
                                                    {post.is_author && (
                                                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-primary">
                                                            Pembuat topik
                                                        </span>
                                                    )}
                                                </p>
                                                <time
                                                    className="text-xs text-muted-foreground"
                                                    dateTime={post.created_at}
                                                >
                                                    {formatDate(
                                                        post.created_at,
                                                        true,
                                                    )}
                                                </time>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm leading-7 whitespace-pre-wrap">
                                            {post.body}
                                        </p>
                                        <Form
                                            action="/forum/laporkan"
                                            method="post"
                                            className="mt-3"
                                        >
                                            <input
                                                type="hidden"
                                                name="type"
                                                value="post"
                                            />
                                            <input
                                                type="hidden"
                                                name="id"
                                                value={post.id}
                                            />
                                            <input
                                                type="hidden"
                                                name="reason"
                                                value="needs_review"
                                            />
                                            <Button
                                                type="submit"
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <Flag aria-hidden="true" />
                                                Laporkan
                                            </Button>
                                        </Form>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-5 sm:p-6">
                            <EmptyState
                                icon={MessageCircle}
                                title="Belum ada balasan"
                                description="Jadilah yang pertama menanggapi topik ini."
                            />
                        </div>
                    )}
                </section>
                {pagination && (
                    <PaginationLinks
                        currentPage={pagination.current_page}
                        lastPage={pagination.last_page}
                        baseUrl={threadUrl}
                    />
                )}
                {thread.is_locked ? (
                    <div className="rounded-2xl border bg-muted/50 p-5 text-sm">
                        <p className="flex items-center gap-2 font-semibold">
                            <Lock className="size-4" aria-hidden="true" />
                            Topik dikunci moderator
                        </p>
                        <p className="mt-1 text-muted-foreground">
                            Balasan baru tidak dapat dikirim.
                        </p>
                    </div>
                ) : (
                    <Form
                        action={`${threadUrl}/balasan`}
                        method="post"
                        resetOnSuccess={['body']}
                        className="eco-card p-5 sm:p-6"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        {({ processing, errors }) => (
                            <>
                                <label htmlFor="body" className="font-semibold">
                                    Tulis balasan
                                </label>
                                <textarea
                                    id="body"
                                    name="body"
                                    rows={5}
                                    maxLength={5000}
                                    required
                                    className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                    placeholder="Sampaikan tanggapan yang relevan dan menghormati warga lain."
                                />
                                {errors.body && (
                                    <p className="mt-2 flex items-center gap-1 text-sm text-destructive">
                                        <AlertTriangle
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        {errors.body}
                                    </p>
                                )}
                                <div className="mt-3 flex justify-end">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <Send aria-hidden="true" />
                                        )}
                                        Kirim balasan
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                )}
            </div>
        </>
    );
}
ForumShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Forum', href: '/forum' },
        { title: 'Topik', href: '#' },
    ],
};

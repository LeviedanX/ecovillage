import { Form, Head, Link } from '@inertiajs/react';
import { Bell, BellRing, CheckCheck, Circle } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/lib/ecovillage';
import type { Paginated } from '@/types';

type UserNotification = {
    id: string;
    title: string;
    message: string;
    href: string;
    kind: string;
    read_at?: string | null;
    created_at?: string | null;
};

export default function Notifications({
    notifications,
}: {
    notifications: Paginated<UserNotification>;
}) {
    const hasUnread = notifications.data.some((item) => !item.read_at);

    return (
        <>
            <Head title="Notifikasi" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Notifikasi"
                    description="Pembaruan penugasan, pengumpulan, poin, program, dan penukaran yang terkait dengan akun Anda."
                    action={
                        hasUnread ? (
                            <Form
                                action="/notifikasi/baca-semua"
                                method="patch"
                            >
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <CheckCheck aria-hidden="true" />
                                        )}
                                        Tandai semua dibaca
                                    </Button>
                                )}
                            </Form>
                        ) : undefined
                    }
                />

                {notifications.data.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title="Belum ada notifikasi"
                        description="Pembaruan penting yang berkaitan dengan aktivitas akun akan muncul di sini."
                    />
                ) : (
                    <section
                        className="eco-card overflow-hidden"
                        aria-label="Daftar notifikasi"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        {/*
                         * Short travel and a quick settle: a notification list
                         * is dense and repeating, and a full-size reveal on
                         * every row turns scrolling it into a flipbook.
                         */}
                        <ul
                            className="divide-y divide-border/70"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {notifications.data.map((notification) => (
                                <li
                                    key={notification.id}
                                    className={
                                        notification.read_at
                                            ? 'p-4 sm:p-5'
                                            : 'bg-secondary/35 p-4 sm:p-5'
                                    }
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm">
                                            {notification.read_at ? (
                                                <Bell
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <BellRing
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <h2 className="flex items-center gap-2 font-semibold">
                                                    {!notification.read_at && (
                                                        <Circle
                                                            className="size-2 fill-primary text-primary"
                                                            aria-label="Belum dibaca"
                                                        />
                                                    )}
                                                    {notification.title}
                                                </h2>
                                                {notification.created_at && (
                                                    <time className="text-xs text-muted-foreground">
                                                        {formatDate(
                                                            notification.created_at,
                                                            true,
                                                        )}
                                                    </time>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {notification.message}
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                <Button
                                                    asChild
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto p-0"
                                                >
                                                    <Link
                                                        href={notification.href}
                                                    >
                                                        Buka detail
                                                    </Link>
                                                </Button>
                                                {!notification.read_at && (
                                                    <Form
                                                        action={`/notifikasi/${notification.id}/baca`}
                                                        method="patch"
                                                    >
                                                        {({ processing }) => (
                                                            <Button
                                                                type="submit"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={
                                                                    processing
                                                                }
                                                            >
                                                                {processing && (
                                                                    <Spinner />
                                                                )}
                                                                Tandai dibaca
                                                            </Button>
                                                        )}
                                                    </Form>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <PaginationLinks
                    currentPage={notifications.current_page}
                    lastPage={notifications.last_page}
                    baseUrl="/notifikasi"
                />
            </div>
        </>
    );
}

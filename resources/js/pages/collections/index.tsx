import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    Map,
    Plus,
    Recycle,
    Search,
    Scale,
    UserRound,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { PaginationLinks } from '@/components/pagination-links';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collectionStatus, formatDate, formatNumber } from '@/lib/ecovillage';
import type { CollectionRequest, Paginated } from '@/types';

type OperationalCollection = CollectionRequest & {
    requester?: { id: number; name: string } | null;
    region?: { id: number; name: string; level?: string } | null;
    active_assignment?: {
        assignee?: { id: number; name: string } | null;
    } | null;
};

type Props = {
    collections?: Paginated<OperationalCollection> | OperationalCollection[];
    filters?: { status?: string; search?: string };
    mode?: 'operations' | string;
};

export default function CollectionIndex({
    collections = [],
    filters = {},
    mode,
}: Props) {
    const items = Array.isArray(collections) ? collections : collections.data;
    const pagination = Array.isArray(collections) ? null : collections;
    const operational = mode === 'operations';
    const baseUrl = operational ? '/operasional/pengumpulan' : '/pengumpulan';

    return (
        <>
            <Head
                title={
                    operational
                        ? 'Operasional Pengumpulan'
                        : 'Riwayat Pengumpulan'
                }
            />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title={
                        operational
                            ? 'Operasional pengumpulan'
                            : 'Riwayat pengumpulan'
                    }
                    description={
                        operational
                            ? 'Tinjau antrean sesuai wilayah atau penugasan, lalu lanjutkan proses yang menjadi kewenangan Anda.'
                            : 'Pantau setiap permintaan dari pengajuan hingga verifikasi.'
                    }
                    action={
                        <Button asChild>
                            <Link
                                href={
                                    operational
                                        ? '/operasional/peta'
                                        : '/pengumpulan/buat'
                                }
                            >
                                {operational ? (
                                    <Map aria-hidden="true" />
                                ) : (
                                    <Plus aria-hidden="true" />
                                )}
                                {operational
                                    ? 'Buka peta tugas'
                                    : 'Buat permintaan'}
                            </Link>
                        </Button>
                    }
                />
                <form
                    action={baseUrl}
                    method="get"
                    className="eco-card flex flex-col gap-3 p-4 sm:flex-row"
                    role="search"
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
                            placeholder="Cari nomor permintaan"
                            className="pl-9"
                            aria-label="Cari nomor permintaan"
                        />
                    </div>
                    <select
                        name="status"
                        defaultValue={filters.status || ''}
                        className="h-9 rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Filter status"
                    >
                        <option value="">Semua status</option>
                        {Object.entries(collectionStatus).map(
                            ([value, meta]) => (
                                <option key={value} value={value}>
                                    {meta.label}
                                </option>
                            ),
                        )}
                    </select>
                    <Button type="submit" variant="secondary">
                        Terapkan
                    </Button>
                </form>
                {items.length > 0 ? (
                    <div className="grid gap-4" data-reveal-group="up">
                        {items.map((collection) => (
                            <CollectionCard
                                key={collection.id}
                                collection={collection}
                                operational={operational}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Recycle}
                        title={
                            operational
                                ? 'Tidak ada antrean sesuai filter'
                                : 'Belum ada riwayat'
                        }
                        description={
                            operational
                                ? 'Permintaan yang sesuai kewenangan dan filter Anda akan muncul di sini.'
                                : 'Permintaan pengumpulan yang Anda buat akan muncul di sini.'
                        }
                        action={
                            operational ? undefined : (
                                <Button asChild>
                                    <Link href="/pengumpulan/buat">
                                        Buat permintaan pertama
                                    </Link>
                                </Button>
                            )
                        }
                    />
                )}
                {pagination && (
                    <PaginationLinks
                        currentPage={pagination.current_page}
                        lastPage={pagination.last_page}
                        baseUrl={baseUrl}
                    />
                )}
            </div>
        </>
    );
}

function CollectionCard({
    collection,
    operational,
}: {
    collection: OperationalCollection;
    operational: boolean;
}) {
    const estimatedWeight =
        collection.total_estimated_weight_kg ??
        collection.items?.reduce(
            (total, item) => total + Number(item.estimated_weight ?? 0),
            0,
        ) ??
        0;
    const verifiedItems =
        collection.items?.filter((item) => item.verified_weight != null) ?? [];
    const verifiedWeight =
        collection.total_verified_weight_kg ??
        (verifiedItems.length > 0
            ? verifiedItems.reduce(
                  (total, item) => total + Number(item.verified_weight ?? 0),
                  0,
              )
            : null);

    return (
        <article className="eco-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                    <Recycle className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">
                            {collection.request_number}
                        </h2>
                        <StatusBadge status={collection.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            {formatDate(
                                collection.desired_at || collection.created_at,
                                Boolean(collection.desired_at),
                            )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Scale className="size-3.5" aria-hidden="true" />
                            {formatNumber(
                                verifiedWeight ?? estimatedWeight,
                            )} kg{' '}
                            {verifiedWeight != null
                                ? 'terverifikasi'
                                : 'estimasi'}
                        </span>
                        <span>
                            {collection.method === 'pickup'
                                ? 'Dijemput'
                                : 'Disetorkan'}
                        </span>
                    </div>
                    {operational && (
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <UserRound
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                {collection.requester?.name || 'Warga'}
                            </span>
                            <span>
                                Wilayah:{' '}
                                {collection.region?.name ||
                                    collection.region_name ||
                                    '—'}
                            </span>
                            {collection.active_assignment?.assignee?.name && (
                                <span>
                                    Petugas:{' '}
                                    {collection.active_assignment.assignee.name}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href={`/pengumpulan/${collection.id}`}>
                        {operational ? 'Proses' : 'Lihat detail'}
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </Button>
            </div>
        </article>
    );
}

CollectionIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pengumpulan', href: '/pengumpulan' },
    ],
};

import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    CalendarHeart,
    Coins,
    MessageSquareWarning,
    PackageSearch,
    Recycle,
    Scale,
    UsersRound,
} from 'lucide-react';
import { lazy } from 'react';
import { EmptyState } from '@/components/empty-state';
import { LazyChart } from '@/components/lazy-chart';
import { MetricCard } from '@/components/metric-card';
import { PageIntro } from '@/components/page-intro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    formatDate,
    formatNumber,
    formatPoints,
    namedValue,
} from '@/lib/ecovillage';
import type { Product, Region } from '@/types';

// Recharts loads with the chart, not with the page.
const MonthlyTrendChart = lazy(
    () => import('@/components/charts/monthly-trend-chart'),
);

type Metrics = {
    total_users?: number | null;
    total_collections?: number;
    verified_weight_kg?: number;
    points_issued?: number;
    points_redeemed?: number;
    green_points?: number;
    programs_count?: number;
};
type StatusPoint = { status: string; label?: string; count: number };
type TrendPoint = {
    month: string;
    organic: number;
    inorganic: number;
    other: number;
};
type ActivityItem = {
    id: number | string;
    description: string;
    actor_name?: string;
    created_at: string;
    module?: string;
};
type Props = {
    metrics?: Metrics;
    statusBreakdown?: StatusPoint[] | Record<string, number>;
    monthlyTrend?: TrendPoint[];
    lowStockProducts?: Product[];
    moderationCount?: number;
    recentActivities?: ActivityItem[];
    regions?: Region[];
    filters?: { from?: string; to?: string; region_id?: string };
};

export default function AdminIndex({
    metrics,
    statusBreakdown = {},
    monthlyTrend = [],
    lowStockProducts = [],
    moderationCount = 0,
    recentActivities = [],
    regions = [],
    filters = {},
}: Props) {
    const statusItems: StatusPoint[] = Array.isArray(statusBreakdown)
        ? statusBreakdown
        : Object.entries(statusBreakdown).map(([status, count]) => ({
              status,
              count: Number(count),
          }));

    return (
        <>
            <Head title="Panel Pengelola" />
            <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Ringkasan operasional"
                    description="Data lintas modul sesuai wilayah dan kewenangan akun Anda."
                    action={
                        <Button asChild variant="outline">
                            <Link href="/operasional/pengumpulan">
                                <Recycle aria-hidden="true" />
                                Buka operasional
                            </Link>
                        </Button>
                    }
                />
                <form
                    action="/dashboard"
                    method="get"
                    className="eco-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_auto]"
                    aria-label="Filter dashboard"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div>
                        <label
                            htmlFor="from"
                            className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                            Dari tanggal
                        </label>
                        <Input
                            id="from"
                            name="from"
                            type="date"
                            defaultValue={filters.from}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="to"
                            className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                            Sampai tanggal
                        </label>
                        <Input
                            id="to"
                            name="to"
                            type="date"
                            defaultValue={filters.to}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="region_id"
                            className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                            Wilayah
                        </label>
                        <select
                            id="region_id"
                            name="region_id"
                            defaultValue={filters.region_id || ''}
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="">
                                Semua wilayah yang diizinkan
                            </option>
                            {regions.map((region) => (
                                <option key={region.id} value={region.id}>
                                    {region.parent_name
                                        ? `${region.parent_name} — `
                                        : ''}
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button type="submit" className="self-end">
                        Terapkan
                    </Button>
                </form>
                <section
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    aria-label="Metrik utama"
                    data-reveal-group="scale"
                    data-reveal-distance="sm"
                    data-reveal-step="70"
                >
                    <MetricCard
                        label="Pengguna"
                        value={
                            metrics
                                ? formatNumber(metrics.total_users ?? 0, 0)
                                : '—'
                        }
                        helper="Sesuai cakupan wilayah"
                        icon={UsersRound}
                        tone="blue"
                    />
                    <MetricCard
                        label="Permintaan"
                        value={
                            metrics
                                ? formatNumber(
                                      metrics.total_collections ?? 0,
                                      0,
                                  )
                                : '—'
                        }
                        helper="Pada periode terpilih"
                        icon={Recycle}
                    />
                    <MetricCard
                        label="Berat terverifikasi"
                        value={
                            metrics
                                ? `${formatNumber(metrics.verified_weight_kg ?? 0)} kg`
                                : '—'
                        }
                        helper="Semua kategori"
                        icon={Scale}
                    />
                    <MetricCard
                        label="Poin diterbitkan"
                        value={
                            metrics
                                ? formatPoints(
                                      metrics.points_issued ??
                                          metrics.green_points ??
                                          0,
                                  )
                                : '—'
                        }
                        helper={
                            metrics?.points_redeemed != null
                                ? `${formatPoints(metrics.points_redeemed)} ditukar`
                                : 'Belum ada data'
                        }
                        icon={Coins}
                        tone="gold"
                    />
                </section>
                <section
                    className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]"
                    data-reveal-group="up"
                >
                    <div className="eco-card p-5 sm:p-6">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Tren berat bulanan
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Komposisi hasil terverifikasi dalam kilogram
                            </p>
                        </div>
                        {monthlyTrend.length > 0 ? (
                            <div className="mt-6 h-80">
                                <LazyChart className="h-72">
                                    <MonthlyTrendChart
                                        data={monthlyTrend}
                                        variant="grouped"
                                    />
                                </LazyChart>
                            </div>
                        ) : (
                            <div className="mt-6">
                                <EmptyState
                                    icon={Scale}
                                    title="Data tren belum tersedia"
                                    description="Ubah filter atau tunggu hasil timbang terverifikasi."
                                />
                            </div>
                        )}
                    </div>
                    <div className="eco-card overflow-hidden">
                        <div className="border-b px-5 py-5 sm:px-6">
                            <h2 className="text-lg font-semibold">
                                Permintaan per status
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Distribusi alur operasional
                            </p>
                        </div>
                        {statusItems.length > 0 ? (
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="40"
                            >
                                {statusItems.map((item) => (
                                    <div
                                        key={item.status}
                                        className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {item.label || item.status}
                                        </span>
                                        <strong className="tabular-nums">
                                            {formatNumber(item.count, 0)}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={Recycle}
                                    title="Belum ada permintaan"
                                    description="Distribusi status akan tampil di sini."
                                />
                            </div>
                        )}
                    </div>
                </section>
                <section
                    className="grid gap-6 lg:grid-cols-3"
                    data-reveal-group="up"
                >
                    <AdminAction
                        href="/operasional/pengumpulan"
                        icon={Recycle}
                        title="Pengumpulan"
                        description="Tinjau permintaan dan penugasan petugas."
                    />
                    <AdminAction
                        href="/kegiatan"
                        icon={CalendarHeart}
                        title="Program"
                        description={`${formatNumber(metrics?.programs_count || 0, 0)} kegiatan tercatat.`}
                    />
                    <AdminAction
                        href="/forum"
                        icon={MessageSquareWarning}
                        title="Moderasi forum"
                        description={`${formatNumber(moderationCount, 0)} laporan menunggu ditinjau.`}
                        warn={moderationCount > 0}
                    />
                </section>
                <section
                    className="grid gap-6 xl:grid-cols-2"
                    data-reveal-group="up"
                >
                    <div className="eco-card overflow-hidden">
                        <div className="flex items-center justify-between border-b px-5 py-5 sm:px-6">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Stok perlu perhatian
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Produk aktif dengan stok rendah
                                </p>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/marketplace">Kelola</Link>
                            </Button>
                        </div>
                        {lowStockProducts.length > 0 ? (
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="40"
                            >
                                {lowStockProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-3 px-5 py-4 sm:px-6"
                                    >
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-950 text-amber-200">
                                            <PackageSearch
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {namedValue(product.category)}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold tabular-nums">
                                            {product.stock}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={PackageSearch}
                                    title="Stok dalam kondisi aman"
                                    description="Tidak ada produk stok rendah pada data saat ini."
                                />
                            </div>
                        )}
                    </div>
                    <div className="eco-card overflow-hidden">
                        <div className="border-b px-5 py-5 sm:px-6">
                            <h2 className="text-lg font-semibold">
                                Aktivitas terbaru
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Perubahan sensitif yang tercatat
                            </p>
                        </div>
                        {recentActivities.length > 0 ? (
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="40"
                            >
                                {recentActivities
                                    .slice(0, 8)
                                    .map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex gap-3 px-5 py-4 sm:px-6"
                                        >
                                            <Activity
                                                className="mt-0.5 size-4 shrink-0 text-primary"
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm leading-5">
                                                    {activity.description}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {activity.actor_name ||
                                                        'Sistem'}{' '}
                                                    ·{' '}
                                                    {formatDate(
                                                        activity.created_at,
                                                        true,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={Activity}
                                    title="Belum ada aktivitas"
                                    description="Aktivitas yang dapat Anda lihat akan muncul di sini."
                                />
                            </div>
                        )}
                    </div>
                </section>
                <div className="flex items-start gap-3 rounded-2xl border border-amber-800 bg-amber-950 p-4 text-sm text-amber-100">
                    <AlertTriangle
                        className="mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <p>
                        Ekspor dan seluruh data pada dashboard harus tetap
                        dibatasi permission serta wilayah di backend; filter
                        antarmuka bukan kontrol keamanan.
                    </p>
                </div>
            </div>
        </>
    );
}
function AdminAction({
    href,
    icon: Icon,
    title,
    description,
    warn = false,
}: {
    href: string;
    icon: typeof Recycle;
    title: string;
    description: string;
    warn?: boolean;
}) {
    return (
        <Link
            href={href}
            className="eco-card flex items-center gap-4 p-5 hover:border-primary/35"
        >
            <span
                className={
                    warn
                        ? 'grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-950 text-amber-200'
                        : 'grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary'
                }
            >
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
        </Link>
    );
}
AdminIndex.layout = {
    breadcrumbs: [
        { title: 'Pengelolaan', href: '/dashboard' },
        { title: 'Dashboard', href: '/dashboard' },
    ],
};

import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarHeart,
    CloudSun,
    Coins,
    Leaf,
    Plus,
    Recycle,
    Scale,
    Sparkles,
} from 'lucide-react';
import { lazy } from 'react';
import { EmptyState } from '@/components/empty-state';

import { LazyChart } from '@/components/lazy-chart';
import { MetricCard } from '@/components/metric-card';
import { PageIntro } from '@/components/page-intro';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber, formatPoints } from '@/lib/ecovillage';
import type {
    CollectionRequest,
    DashboardSummary,
    EducationContent,
    Program,
} from '@/types';

// Recharts stays off this page's critical path; it arrives with the chart.
const MonthlyTrendChart = lazy(
    () => import('@/components/charts/monthly-trend-chart'),
);

type TrendPoint = {
    month: string;
    organic: number;
    inorganic: number;
    other: number;
};

type Props = {
    summary?: DashboardSummary;
    recentCollections?: CollectionRequest[];
    upcomingPrograms?: Program[];
    education?: EducationContent[];
    monthlyTrend?: TrendPoint[];
};

export default function Dashboard({
    summary,
    recentCollections = [],
    upcomingPrograms = [],
    education = [],
    monthlyTrend = [],
}: Props) {
    const { auth } = usePage().props;
    const firstName = auth.user?.name?.split(' ')[0] || 'Warga';
    const operational = summary?.role === 'kader';

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title={`Selamat datang, ${firstName}`}
                    description={
                        operational
                            ? 'Pantau tugas aktif, hasil timbang, dan progres pekerjaan Anda.'
                            : 'Pantau kontribusi terbaru dan lanjutkan aksi lingkungan Anda.'
                    }
                    action={
                        <Button asChild className="w-full sm:w-auto">
                            <Link
                                href={
                                    operational
                                        ? '/operasional/pengumpulan'
                                        : '/pengumpulan/buat'
                                }
                            >
                                <Plus aria-hidden="true" />
                                {operational
                                    ? 'Buka daftar tugas'
                                    : 'Buat permintaan'}
                            </Link>
                        </Button>
                    }
                />

                <section
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    aria-label="Ringkasan kontribusi"
                    data-reveal-group="scale"
                    data-reveal-distance="sm"
                    data-reveal-step="70"
                >
                    <MetricCard
                        label={
                            operational
                                ? 'Berat tugas terverifikasi'
                                : 'Sampah terverifikasi'
                        }
                        value={
                            summary
                                ? `${formatNumber(summary.verified_weight_kg)} kg`
                                : '—'
                        }
                        helper="Berdasarkan hasil timbang"
                        icon={Scale}
                    />
                    <MetricCard
                        label={
                            operational ? 'Total tugas' : 'Saldo Green Points'
                        }
                        value={
                            summary
                                ? operational
                                    ? formatNumber(
                                          summary.total_collections || 0,
                                          0,
                                      )
                                    : formatPoints(
                                          summary.point_balance ??
                                              summary.green_points ??
                                              0,
                                      )
                                : '—'
                        }
                        helper={
                            operational
                                ? 'Sesuai penugasan aktif dan historis'
                                : 'Dari transaksi yang tercatat'
                        }
                        icon={operational ? Recycle : Coins}
                        tone="gold"
                    />
                    <MetricCard
                        label="Estimasi dampak"
                        value={
                            summary
                                ? `${formatNumber(summary.impact_kg_co2e ?? 0)} kg CO₂e`
                                : '—'
                        }
                        helper="Bukan klaim LCA penuh"
                        icon={CloudSun}
                        tone="blue"
                    />
                    <MetricCard
                        label="Menunggu diproses"
                        value={
                            summary
                                ? formatNumber(
                                      summary.pending_collections || 0,
                                      0,
                                  )
                                : '—'
                        }
                        helper="Permintaan aktif"
                        icon={Recycle}
                    />
                </section>

                <section
                    className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]"
                    data-reveal-group="up"
                >
                    <div className="eco-card p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Komposisi kontribusi
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Berat terverifikasi per bulan (kg)
                                </p>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/dampak">
                                    Lihat dampak{' '}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        {monthlyTrend.length > 0 ? (
                            <div
                                className="mt-6 h-72 w-full"
                                role="img"
                                aria-label="Grafik komposisi kontribusi bulanan"
                            >
                                <LazyChart className="h-72">
                                    <MonthlyTrendChart data={monthlyTrend} />
                                </LazyChart>
                            </div>
                        ) : (
                            <div className="mt-6">
                                <EmptyState
                                    icon={Scale}
                                    title="Belum ada data tren"
                                    description="Grafik akan terbentuk setelah ada pengumpulan yang selesai diverifikasi."
                                />
                            </div>
                        )}
                    </div>

                    <div className="eco-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold">Akses cepat</h2>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <QuickLink
                                href={
                                    operational
                                        ? '/operasional/pengumpulan'
                                        : '/pengumpulan/buat'
                                }
                                icon={Recycle}
                                label={
                                    operational
                                        ? 'Daftar tugas'
                                        : 'Setor sampah'
                                }
                            />
                            <QuickLink
                                href={
                                    operational ? '/operasional/peta' : '/poin'
                                }
                                icon={operational ? CloudSun : Coins}
                                label={
                                    operational ? 'Peta tugas' : 'Green Points'
                                }
                            />
                            <QuickLink
                                href="/kegiatan"
                                icon={CalendarHeart}
                                label="Kegiatan"
                            />
                            <QuickLink
                                href="/edukasi"
                                icon={BookOpen}
                                label="Edukasi"
                            />
                        </div>
                        <div className="mt-5 rounded-2xl bg-secondary p-4">
                            <div className="flex gap-3">
                                <Sparkles
                                    className="mt-0.5 size-5 shrink-0 text-primary"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="text-sm font-semibold">
                                        Dampak dan poin dipisahkan
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        Keduanya dihitung dari berat
                                        terverifikasi, tetapi menggunakan aturan
                                        dan catatan berbeda.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"
                    data-reveal-group="up"
                >
                    <div className="eco-card overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b px-5 py-5 sm:px-6">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Pengumpulan terbaru
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Status permintaan Anda
                                </p>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/pengumpulan">
                                    Semua <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        {recentCollections.length > 0 ? (
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="45"
                            >
                                {recentCollections
                                    .slice(0, 4)
                                    .map((collection) => (
                                        <Link
                                            key={collection.id}
                                            href={`/pengumpulan/${collection.id}`}
                                            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/45 sm:px-6"
                                        >
                                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                                <Recycle
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold">
                                                    {collection.request_number}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                    {formatDate(
                                                        collection.desired_at ||
                                                            collection.created_at,
                                                        Boolean(
                                                            collection.desired_at,
                                                        ),
                                                    )}{' '}
                                                    ·{' '}
                                                    {formatNumber(
                                                        collection.total_verified_weight_kg ??
                                                            collection.total_estimated_weight_kg ??
                                                            0,
                                                    )}{' '}
                                                    kg
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={collection.status}
                                                className="hidden sm:inline-flex"
                                            />
                                        </Link>
                                    ))}
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={Recycle}
                                    title="Belum ada pengumpulan"
                                    description="Buat permintaan pertama untuk mulai mencatat kontribusi."
                                    action={
                                        <Button asChild size="sm">
                                            <Link href="/pengumpulan/buat">
                                                Buat permintaan
                                            </Link>
                                        </Button>
                                    }
                                />
                            </div>
                        )}
                    </div>

                    <div className="eco-card p-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Program mendatang
                            </h2>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/kegiatan">
                                    Lihat <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        {upcomingPrograms.length > 0 ? (
                            <div
                                className="mt-5 space-y-3"
                                data-reveal-group="left"
                                data-reveal-distance="xs"
                                data-reveal-step="55"
                            >
                                {upcomingPrograms.slice(0, 3).map((program) => (
                                    <Link
                                        href={`/kegiatan/${program.slug}`}
                                        key={program.id}
                                        className="flex gap-3 rounded-xl border p-3 hover:border-primary/35"
                                    >
                                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                            <CalendarHeart
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">
                                                {program.title}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatDate(
                                                    program.starts_at,
                                                    true,
                                                )}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5">
                                <EmptyState
                                    icon={CalendarHeart}
                                    title="Belum ada agenda"
                                    description="Program yang dapat diikuti akan tampil di sini."
                                />
                            </div>
                        )}
                    </div>
                </section>

                {education.length > 0 && (
                    <section>
                        <div
                            className="flex items-end justify-between gap-3"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Materi terbaru
                                </h2>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/edukasi">
                                    Semua materi{' '}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                        <div
                            className="mt-4 grid gap-4 md:grid-cols-3"
                            data-reveal-group="up"
                        >
                            {education.slice(0, 3).map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/edukasi/${item.slug}`}
                                    className="eco-card p-5"
                                >
                                    <Leaf
                                        className="size-5 text-primary"
                                        aria-hidden="true"
                                    />
                                    <p className="mt-3 line-clamp-2 leading-6 font-semibold">
                                        {item.title}
                                    </p>
                                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                        {item.excerpt}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}

function QuickLink({
    href,
    icon: Icon,
    label,
}: {
    href: string;
    icon: typeof Recycle;
    label: string;
}) {
    return (
        <Link
            href={href}
            className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-secondary/35"
        >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">{label}</span>
        </Link>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: '/dashboard' }],
};

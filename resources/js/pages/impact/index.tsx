import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CloudSun,
    FlaskConical,
    Recycle,
    Scale,
} from 'lucide-react';
import { lazy } from 'react';
import { EmptyState } from '@/components/empty-state';
import { LazyChart } from '@/components/lazy-chart';
import { MetricCard } from '@/components/metric-card';
import { PageIntro } from '@/components/page-intro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber } from '@/lib/ecovillage';
import type { ImpactFactorSet, ImpactSummary } from '@/types';

// Recharts loads with the charts, not with the page.
const CompositionChart = lazy(() =>
    import('@/components/charts/impact-charts').then((module) => ({
        default: module.CompositionChart,
    })),
);
const ImpactTrendChart = lazy(() =>
    import('@/components/charts/impact-charts').then((module) => ({
        default: module.ImpactTrendChart,
    })),
);

type Composition = {
    name?: string;
    category?: string;
    weight_kg: number;
    impact_kg_co2e?: number;
};
type Trend = {
    month: string;
    weight_kg: number;
    impact_kg_co2e?: number;
    carbon_kg_co2e?: number;
};
type Props = {
    summary?: ImpactSummary;
    composition?: Composition[];
    trend?: Trend[];
    factorSet?: ImpactFactorSet | null;
};

const chartColors = [
    'var(--chart-1)',
    'var(--chart-4)',
    'var(--chart-3)',
    'var(--chart-5)',
    'var(--chart-2)',
];

export default function ImpactIndex({
    summary,
    composition = [],
    trend = [],
    factorSet,
}: Props) {
    const compositionData = composition.map((item) => ({
        ...item,
        name: item.name || item.category || 'Kategori lain',
    }));
    const trendData = trend.map((item) => ({
        ...item,
        impact_kg_co2e: item.impact_kg_co2e ?? item.carbon_kg_co2e ?? 0,
    }));

    return (
        <>
            <Head title="Estimasi Dampak Lingkungan" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Estimasi Dampak Lingkungan"
                    description="Estimasi menggunakan berat terverifikasi dikali faktor aktif saat transaksi dibuat. Ini bukan LCA penuh."
                    action={
                        <Button asChild variant="outline">
                            <Link href="/metodologi-dampak">
                                Baca metodologi{' '}
                                <ArrowUpRight aria-hidden="true" />
                            </Link>
                        </Button>
                    }
                />
                {factorSet?.is_demo && (
                    <Alert variant="destructive">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>DEMO — TIDAK UNTUK KLAIM ILMIAH</AlertTitle>
                        <AlertDescription>
                            Faktor aktif adalah data demonstrasi. Hasil hanya
                            untuk pengujian alur sistem, bukan dasar publikasi
                            ilmiah atau klaim emisi.
                        </AlertDescription>
                    </Alert>
                )}
                <section
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    data-reveal-group="up"
                >
                    <MetricCard
                        label="Total terverifikasi"
                        value={
                            summary
                                ? `${formatNumber(summary.verified_weight_kg)} kg`
                                : '—'
                        }
                        helper="Dasar perhitungan"
                        icon={Scale}
                    />
                    <MetricCard
                        label="Estimasi dampak"
                        value={
                            summary
                                ? `${formatNumber(summary.impact_kg_co2e ?? summary.carbon_kg_co2e ?? 0)} kg CO₂e`
                                : '—'
                        }
                        helper="Sesuai faktor berversi"
                        icon={CloudSun}
                        tone="blue"
                    />
                    <MetricCard
                        label="Potensi daur ulang"
                        value={
                            summary
                                ? `${formatNumber(summary.recycling_potential_kg ?? summary.recyclable_kg ?? 0)} kg`
                                : '—'
                        }
                        helper="Estimasi, bukan hasil aktual"
                        icon={Recycle}
                    />
                </section>
                <section
                    className="grid gap-6 xl:grid-cols-2"
                    data-reveal-group="up"
                >
                    <ChartCard
                        title="Komposisi sampah"
                        description="Berat terverifikasi per kategori"
                    >
                        {compositionData.length > 0 ? (
                            <div className="h-72">
                                <LazyChart className="h-72">
                                    <CompositionChart
                                        data={compositionData}
                                        colors={chartColors}
                                    />
                                </LazyChart>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Recycle}
                                title="Belum ada komposisi"
                                description="Data tampil setelah pengumpulan diverifikasi."
                            />
                        )}
                    </ChartCard>
                    <ChartCard
                        title="Tren dampak"
                        description="Berat dan estimasi CO₂e per bulan"
                    >
                        {trendData.length > 0 ? (
                            <div className="h-72">
                                <LazyChart className="h-72">
                                    <ImpactTrendChart data={trendData} />
                                </LazyChart>
                            </div>
                        ) : (
                            <EmptyState
                                icon={CloudSun}
                                title="Belum ada tren dampak"
                                description="Data historis akan tetap terikat ke versi faktor saat dibuat."
                            />
                        )}
                    </ChartCard>
                </section>
                <section
                    className="eco-card p-5 sm:p-6"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="flex gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                            <FlaskConical
                                className="size-5"
                                aria-hidden="true"
                            />
                        </span>
                        <div>
                            <h2 className="font-semibold">
                                Factor set yang digunakan
                            </h2>
                            {factorSet ? (
                                <dl className="mt-3 grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Nama dan versi
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {factorSet.name} ·{' '}
                                            {factorSet.version}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Tanggal berlaku
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {formatDate(
                                                factorSet.effective_date,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-muted-foreground">
                                            Sumber
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {factorSet.source ||
                                                factorSet.source_name ||
                                                'Belum dicantumkan'}
                                        </dd>
                                    </div>
                                    {factorSet.methodology_notes && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-muted-foreground">
                                                Catatan metodologi
                                            </dt>
                                            <dd className="mt-1 leading-6">
                                                {factorSet.methodology_notes}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Belum ada factor set untuk ditampilkan.
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

function ChartCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section
            className="eco-card p-5 sm:p-6"
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-5">{children}</div>
        </section>
    );
}

ImpactIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Estimasi dampak', href: '/dampak' },
    ],
};

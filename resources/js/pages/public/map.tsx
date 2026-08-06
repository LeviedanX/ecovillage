import { MapPinned, Recycle, Scale } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { PublicHomeLink } from '@/components/public-home-link';
import { PublicImpactMap } from '@/components/public-impact-map';
import type { AggregateMapPoint } from '@/components/public-impact-map';
import { Seo } from '@/components/seo';
import { formatNumber } from '@/lib/ecovillage';

type Props = {
    points?: AggregateMapPoint[];
    summary?: {
        verified_weight_kg: number;
        locations: number;
        period_label?: string;
    };
    mapStyleUrl?: string;
    internal?: boolean;
    privacy?: { minimum_records?: number; precision?: string };
    filters?: {
        from?: string;
        to?: string;
        category?: string;
        region?: string;
    };
};

export default function PublicMap({
    points = [],
    summary,
    mapStyleUrl,
    internal = false,
    privacy,
    filters = {},
}: Props) {
    return (
        <>
            <Seo
                title={internal ? 'Peta Operasional' : 'Peta Dampak Publik'}
                description={
                    internal
                        ? 'Peta tugas aktif sesuai kewenangan petugas.'
                        : 'Peta agregat kontribusi sampah terverifikasi tanpa alamat rumah atau koordinat tepat warga.'
                }
                // Peta operasional memuat titik tugas dan tidak boleh diindeks.
                noindex={internal}
            />
            <section className="relative isolate overflow-hidden">
                <div
                    className="eco-container eco-section relative"
                    data-reveal-group="up"
                    data-reveal-step="80"
                >
                    {!internal && <PublicHomeLink className="mb-7" />}
                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                        {internal
                            ? 'Titik tugas aktif sesuai kewenangan Anda.'
                            : 'Melihat gerakan wilayah tanpa membuka lokasi pribadi.'}
                    </h1>
                    <p className="mt-5 max-w-3xl leading-7 text-muted-foreground">
                        {internal
                            ? 'Koordinat tepat hanya ditampilkan untuk permintaan aktif yang relevan dengan penugasan atau wilayah Anda.'
                            : 'Peta hanya menggunakan data selesai dan terverifikasi yang telah diagregasi. Alamat rumah, nomor telepon, dan titik koordinat tepat tidak pernah ditampilkan.'}
                    </p>
                </div>
            </section>
            <div className="eco-surface">
                <section className="eco-container eco-section-sm">
                    <div
                        className="mb-6 grid gap-4 sm:grid-cols-2"
                        data-reveal-group="scale"
                        data-reveal-distance="sm"
                        data-reveal-step="70"
                    >
                        <MetricCard
                            label={
                                internal
                                    ? 'Estimasi berat tugas'
                                    : 'Sampah terverifikasi'
                            }
                            value={
                                summary
                                    ? `${formatNumber(summary.verified_weight_kg)} kg`
                                    : internal
                                      ? `${formatNumber(points.reduce((total, point) => total + point.weight_kg, 0))} kg`
                                      : '—'
                            }
                            helper={
                                summary?.period_label ||
                                (internal
                                    ? 'Tugas aktif'
                                    : 'Sesuai periode yang dipilih')
                            }
                            icon={Scale}
                        />
                        <MetricCard
                            label={internal ? 'Titik tugas' : 'Wilayah agregat'}
                            value={formatNumber(
                                summary?.locations ?? points.length,
                                0,
                            )}
                            helper={
                                internal
                                    ? 'Permintaan aktif'
                                    : 'Bukan titik rumah'
                            }
                            icon={MapPinned}
                            tone="blue"
                        />
                    </div>
                    {!internal && (
                        <form
                            action="/peta"
                            method="get"
                            className="mb-5 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto]"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <label className="text-xs font-medium text-muted-foreground">
                                Dari tanggal
                                <input
                                    type="date"
                                    name="from"
                                    defaultValue={filters.from}
                                    className="mt-1.5 block h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                                />
                            </label>
                            <label className="text-xs font-medium text-muted-foreground">
                                Sampai tanggal
                                <input
                                    type="date"
                                    name="to"
                                    defaultValue={filters.to}
                                    className="mt-1.5 block h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                                />
                            </label>
                            <button
                                type="submit"
                                className="h-9 self-end rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                            >
                                Terapkan
                            </button>
                        </form>
                    )}
                    <PublicImpactMap
                        points={points}
                        styleUrl={mapStyleUrl}
                        cluster={!internal}
                        privacyMessage={
                            internal
                                ? 'Titik tepat hanya untuk tugas aktif yang berwenang Anda akses.'
                                : privacy?.precision ||
                                  'Koordinat telah diagregasi; peta tidak menampilkan alamat rumah.'
                        }
                    />
                    <div className="mt-6 rounded-2xl border bg-card p-5">
                        <div className="flex gap-3">
                            <Recycle
                                className="mt-0.5 size-5 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            <div>
                                <h2 className="font-semibold">
                                    Cara membaca peta
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {internal
                                        ? 'Setiap titik menunjukkan permintaan aktif dalam cakupan tugas atau wilayah Anda. Setelah tugas selesai, titik tidak lagi ditampilkan pada peta operasional.'
                                        : `Semakin besar lingkaran, semakin banyak catatan selesai pada area tersebut.${privacy?.minimum_records ? ` Minimal ${privacy.minimum_records} catatan diperlukan per wilayah.` : ''}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

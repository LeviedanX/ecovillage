import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BookOpenCheck,
    Calculator,
    History,
    Scale,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Methodology() {
    return (
        <>
            <Head title="Metodologi Estimasi Dampak">
                <meta
                    name="description"
                    content="Ruang lingkup, formula, versi faktor, dan batas metodologi Estimasi Dampak Lingkungan EcoVillage.id."
                />
            </Head>
            <section className="relative isolate overflow-hidden">
                <div
                    className="eco-container eco-section relative"
                    data-reveal-group="up"
                    data-reveal-step="80"
                >
                    <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                        Cara EcoVillage.id menghitung Estimasi Dampak
                        Lingkungan.
                    </h1>
                    <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                        Modul ini membantu membaca kontribusi terverifikasi
                        menggunakan faktor yang dapat dikonfigurasi dan
                        berversi. Hasilnya bukan Life Cycle Assessment penuh.
                    </p>
                </div>
            </section>
            <div className="eco-surface">
                <div className="eco-container eco-section max-w-5xl space-y-8">
                    <section
                        className="eco-card p-6 sm:p-8"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        <div className="flex gap-4">
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                                <Calculator
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            {/*
                             * `min-w-0` lets this column shrink below the
                             * min-content width of the nowrap formula below, so the
                             * formula scrolls inside its own box instead of pushing
                             * the page sideways on narrow screens.
                             */}
                            <div className="min-w-0">
                                <h2 className="text-xl font-semibold">
                                    Formula dasar
                                </h2>
                                <p className="mt-3 leading-7 text-muted-foreground">
                                    Untuk setiap item, sistem menggunakan:
                                </p>
                                <div className="eco-table-wrap mt-4 rounded-xl bg-[#123c2b] px-5 py-4 font-mono text-sm font-semibold whitespace-nowrap text-lime-200">
                                    berat terverifikasi × faktor dampak aktif
                                </div>
                                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                    Berat estimasi warga tidak dipakai. Hasil
                                    per item dijumlahkan untuk membentuk
                                    ringkasan pengumpulan.
                                </p>
                            </div>
                        </div>
                    </section>
                    <div
                        className="grid gap-5 md:grid-cols-2"
                        data-reveal-group="up"
                        data-reveal-distance="sm"
                        data-reveal-step="70"
                    >
                        <InfoCard
                            icon={Scale}
                            title="Data masukan"
                            items={[
                                'Berat hasil timbang yang telah diverifikasi.',
                                'Jenis dan kategori sampah terverifikasi.',
                                'Factor set aktif pada waktu perhitungan.',
                            ]}
                        />
                        <InfoCard
                            icon={History}
                            title="Versioning"
                            items={[
                                'Nama dan versi factor set disimpan bersama hasil.',
                                'Perubahan faktor tidak menghitung ulang transaksi lama.',
                                'Status faktor dapat berupa draft, active, atau archived.',
                            ]}
                        />
                    </div>
                    <section
                        className="eco-card p-6 sm:p-8"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        <div className="flex gap-4">
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                                <BookOpenCheck
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Informasi yang harus menyertai faktor
                                </h2>
                                <p className="mt-3 leading-7 text-muted-foreground">
                                    Setiap set faktor perlu mencantumkan sumber
                                    data, versi, unit, tanggal berlaku, cakupan
                                    wilayah, serta catatan asumsi. Data
                                    demonstrasi wajib diberi label{' '}
                                    <strong className="text-foreground">
                                        DEMO — TIDAK UNTUK KLAIM ILMIAH
                                    </strong>
                                    .
                                </p>
                            </div>
                        </div>
                    </section>
                    <section
                        className="rounded-[1.75rem] border border-amber-800 bg-amber-950 p-6 text-amber-100 sm:p-8"
                        data-reveal="scale"
                        data-reveal-distance="sm"
                    >
                        <div className="flex gap-4">
                            <AlertTriangle
                                className="mt-0.5 size-6 shrink-0"
                                aria-hidden="true"
                            />
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Batas interpretasi
                                </h2>
                                <ul className="mt-4 space-y-3 text-sm leading-6">
                                    <li>
                                        Estimasi tidak mencakup seluruh siklus
                                        hidup, perpindahan material, konsumsi
                                        energi, atau efek substitusi secara
                                        lengkap.
                                    </li>
                                    <li>
                                        Angka tidak boleh digunakan sebagai
                                        klaim emisi atau keberlanjutan tanpa
                                        validasi sumber dan metodologi
                                        independen.
                                    </li>
                                    <li>
                                        Potensi daur ulang adalah estimasi
                                        berbasis faktor, bukan bukti material
                                        benar-benar berhasil didaur ulang.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>
                    <div className="flex flex-col items-start justify-between gap-5 rounded-[1.75rem] bg-primary p-7 text-primary-foreground sm:flex-row sm:items-center">
                        <div className="flex gap-3">
                            <ShieldCheck
                                className="mt-0.5 size-5 shrink-0"
                                aria-hidden="true"
                            />
                            <div>
                                <h2 className="font-semibold">
                                    Lihat hasil pribadi
                                </h2>
                                <p className="mt-1 text-sm text-primary-foreground/75">
                                    Dashboard menampilkan factor set yang
                                    digunakan pada hasil Anda.
                                </p>
                            </div>
                        </div>
                        <Button asChild variant="secondary">
                            <Link href="/dampak">
                                Buka estimasi dampak{' '}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
function InfoCard({
    icon: Icon,
    title,
    items,
}: {
    icon: typeof Scale;
    title: string;
    items: string[];
}) {
    return (
        <section
            className="eco-card p-6"
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <Icon className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <ul className="mt-4 space-y-3">
                {items.map((item) => (
                    <li
                        key={item}
                        className="flex gap-2 text-sm leading-6 text-muted-foreground"
                    >
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}

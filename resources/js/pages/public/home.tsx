import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarHeart,
    ChevronRight,
    CloudSun,
    Coins,
    Recycle,
    ShoppingBag,
    Sprout,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
    formatNumber,
    formatPoints,
    namedValue,
    publicAssetUrl,
} from '@/lib/ecovillage';
import type { EducationContent, Product, Program } from '@/types';

type Props = {
    statistics?: {
        verified_weight_kg: number;
        households: number;
        completed_collections: number;
        impact_kg_co2e: number;
    };
    stats?: {
        verified_weight_kg: number;
        households: number;
        completed_collections: number;
        impact_kg_co2e: number;
    };
    programs?: Program[];
    education?: EducationContent[];
    products?: Product[];
    siteSettings?: Record<string, string>;
};

const benefits = [
    {
        icon: Recycle,
        title: 'Setor lebih teratur',
        description:
            'Ajukan penjemputan atau setoran, pilih jenis sampah, lalu pantau statusnya dari satu tempat.',
    },
    {
        icon: Coins,
        title: 'Kontribusi yang tercatat',
        description:
            'Green Points diberikan dari berat terverifikasi dan tersimpan sebagai riwayat transaksi yang transparan.',
    },
    {
        icon: CloudSun,
        title: 'Dampak yang bisa ditelusuri',
        description:
            'Lihat Estimasi Dampak beserta versi faktor, sumber, asumsi, dan batas metodologinya.',
    },
];

const flow = [
    {
        number: '01',
        title: 'Ajukan',
        description:
            'Pilih metode, jenis sampah, jadwal, dan titik lokasi dengan persetujuan.',
    },
    {
        number: '02',
        title: 'Petugas memproses',
        description:
            'Kader mengambil atau menerima setoran, lalu mencatat hasil timbang.',
    },
    {
        number: '03',
        title: 'Pengelola memverifikasi',
        description:
            'Jenis dan berat diperiksa sebelum poin serta estimasi dampak dihitung.',
    },
    {
        number: '04',
        title: 'Manfaat kembali ke warga',
        description:
            'Pantau kontribusi, ikut program, dan tukarkan poin pada katalog terkelola.',
    },
];

export default function Home({
    statistics,
    stats,
    programs = [],
    education = [],
    products = [],
    siteSettings = {},
}: Props) {
    const publicStats = statistics || stats;

    return (
        <>
            <Head title="Beranda">
                <meta
                    name="description"
                    content="EcoVillage.id membantu warga mengelola pengumpulan sampah, kegiatan lingkungan, Green Points, dan estimasi dampak secara transparan."
                />
            </Head>

            <section className="relative isolate overflow-hidden">
                {/*
                 * Foto unggahan admin tampil apa adanya: tidak ada blob warna
                 * maupun lapisan grain di atasnya. Kecerahan foto adalah
                 * tanggung jawab berkas yang diunggah admin.
                 */}
                {siteSettings.landing_hero_background_image && (
                    <div className="absolute inset-0 -z-20" aria-hidden="true">
                        <img
                            src={siteSettings.landing_hero_background_image}
                            alt=""
                            className="size-full object-cover"
                        />
                    </div>
                )}
                {/*
                 * Dua kolom hanya saat admin memasang foto hero. Tanpa foto,
                 * kolom kanan tidak diisi apa pun — memaksakan grid di situ
                 * menyisakan setengah layar kosong di desktop.
                 */}
                <div
                    className={`eco-container grid min-h-128 items-center gap-10 py-14 sm:gap-12 sm:py-16 lg:min-h-170 lg:py-24 ${
                        siteSettings.landing_hero_image
                            ? 'lg:grid-cols-[1.08fr_.92fr]'
                            : ''
                    }`}
                >
                    <div
                        className="relative"
                        data-reveal-group="up"
                        data-reveal-step="90"
                    >
                        <h1 className="max-w-3xl text-4xl leading-[1.08] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
                            {siteSettings.landing_hero_lead ||
                                'Aksi lingkungan warga,'}{' '}
                            <span className="eco-gradient-text">
                                {siteSettings.landing_hero_highlight ||
                                    'tercatat dan bertumbuh'}
                            </span>{' '}
                            {siteSettings.landing_hero_suffix || 'bersama.'}
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                            {siteSettings.landing_hero_subtitle ||
                                'Kelola pengumpulan sampah, pantau Green Points, ikuti EcoPore dan EcoCycle, serta pahami estimasi dampak dalam satu platform komunitas.'}
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button
                                asChild
                                size="lg"
                                className="h-12 rounded-xl px-6"
                            >
                                <Link
                                    href={
                                        siteSettings.landing_hero_primary_cta_href ||
                                        '/register'
                                    }
                                >
                                    {siteSettings.landing_hero_primary_cta_label ||
                                        'Mulai berkontribusi'}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="h-12 rounded-xl px-6"
                            >
                                <Link
                                    href={
                                        siteSettings.landing_hero_secondary_cta_href ||
                                        '/tentang'
                                    }
                                >
                                    {siteSettings.landing_hero_secondary_cta_label ||
                                        'Pelajari cara kerja'}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {siteSettings.landing_hero_image && (
                        <div data-reveal="scale" data-reveal-delay="220">
                            <img
                                src={siteSettings.landing_hero_image}
                                alt=""
                                className="aspect-square w-full rounded-4xl border object-cover shadow-xl"
                            />
                        </div>
                    )}
                </div>
            </section>

            {/*
             * Seluruh area konten duduk pada satu permukaan kaca. Jarak antar-
             * bagian dibentuk oleh padding `eco-section`, tanpa garis maupun
             * pita warna, sehingga foto latar terbaca sebagai satu bidang utuh.
             */}
            <div className="eco-surface">
                <section aria-labelledby="statistik-heading">
                    <h2 id="statistik-heading" className="sr-only">
                        Statistik dampak komunitas
                    </h2>
                    <div
                        className="eco-container grid grid-cols-2 gap-y-2 py-8 md:grid-cols-4"
                        data-reveal-group="up"
                        data-reveal-distance="sm"
                        data-reveal-step="80"
                    >
                        <Stat
                            label="Sampah terverifikasi"
                            value={
                                publicStats
                                    ? `${formatNumber(publicStats.verified_weight_kg)} kg`
                                    : '—'
                            }
                        />
                        <Stat
                            label="Rumah tangga berkontribusi"
                            value={
                                publicStats
                                    ? formatNumber(publicStats.households, 0)
                                    : '—'
                            }
                        />
                        <Stat
                            label="Pengumpulan selesai"
                            value={
                                publicStats
                                    ? formatNumber(
                                          publicStats.completed_collections,
                                          0,
                                      )
                                    : '—'
                            }
                        />
                        <Stat
                            label="Estimasi dampak"
                            value={
                                publicStats
                                    ? `${formatNumber(publicStats.impact_kg_co2e)} kg CO₂e`
                                    : '—'
                            }
                        />
                    </div>
                </section>

                <section className="eco-container eco-section">
                    <SectionHeading
                        title="Satu alur sederhana, manfaatnya kembali ke komunitas"
                        description="EcoVillage.id menghubungkan warga, kader, dan pengelola tanpa mengaburkan siapa yang memverifikasi data."
                    />
                    <div
                        className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3"
                        data-reveal-group="up"
                    >
                        {benefits.map((benefit) => (
                            <article
                                key={benefit.title}
                                className="eco-card eco-card-interactive p-5 sm:p-6 lg:p-7"
                            >
                                <span className="eco-icon-tile size-11">
                                    <benefit.icon
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h3 className="mt-5 text-lg font-semibold">
                                    {benefit.title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {benefit.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="eco-container eco-section">
                        <SectionHeading
                            title="Dari permintaan hingga kontribusi terverifikasi"
                            description="Poin dan estimasi dampak baru dihitung setelah hasil timbang selesai diverifikasi."
                        />
                        <ol
                            className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
                            data-reveal-group="up"
                        >
                            {flow.map((item, index) => (
                                <li
                                    key={item.number}
                                    className="group relative"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-transform duration-400 ease-out-quint group-hover:scale-110">
                                            {item.number}
                                        </span>
                                        {index < flow.length - 1 && (
                                            <span className="hidden h-px flex-1 origin-left scale-x-100 bg-border transition-colors duration-400 group-hover:bg-primary/45 lg:block" />
                                        )}
                                    </div>
                                    <h3 className="mt-5 font-semibold">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {item.description}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="eco-container eco-section">
                    <SectionHeading
                        title="Belajar, mempraktikkan, lalu menularkan perubahan"
                        description="EcoPore berfokus pada pengolahan organik berbasis biopori. EcoCycle mendorong pengolahan anorganik menjadi produk bernilai."
                        link={{
                            label: 'Lihat semua program',
                            href: '/program',
                        }}
                    />
                    {programs.length > 0 ? (
                        <div
                            className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
                            data-reveal-group="up"
                        >
                            {programs.slice(0, 3).map((program) => (
                                <ProgramCard
                                    key={program.id}
                                    program={program}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-10">
                            <EmptyState
                                icon={CalendarHeart}
                                title="Belum ada program terbit"
                                description="Jadwal EcoPore dan EcoCycle akan tampil setelah dipublikasikan pengelola."
                            />
                        </div>
                    )}
                </section>

                <section>
                    <div className="eco-container eco-section">
                        <SectionHeading
                            title="Pengetahuan praktis yang memiliki sumber"
                            description="Materi edukasi dipublikasikan dengan penulis, tanggal, dan rujukan yang dapat ditelusuri."
                            link={{
                                label: 'Buka pusat edukasi',
                                href: '/edukasi',
                            }}
                        />
                        {education.length > 0 ? (
                            <div
                                className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3"
                                data-reveal-group="up"
                            >
                                {education.slice(0, 3).map((content) => (
                                    <EducationCard
                                        key={content.id}
                                        content={content}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-10">
                                <EmptyState
                                    icon={BookOpen}
                                    title="Materi sedang disiapkan"
                                    description="Materi yang telah melalui proses publikasi akan muncul di sini."
                                />
                            </div>
                        )}
                    </div>
                </section>

                <section className="eco-container eco-section">
                    <SectionHeading
                        title="Tukarkan Green Points dengan produk program"
                        description="Stok dan saldo diperiksa saat penukaran."
                        link={{ label: 'Jelajahi katalog', href: '/katalog' }}
                    />
                    {products.length > 0 ? (
                        <div
                            className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
                            data-reveal-group="scale"
                        >
                            {products.slice(0, 4).map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-10">
                            <EmptyState
                                icon={ShoppingBag}
                                title="Katalog belum tersedia"
                                description="Produk EcoPore dan EcoCycle yang aktif akan ditampilkan di sini."
                            />
                        </div>
                    )}
                </section>

                <section className="eco-container pb-[clamp(3.5rem,2.2rem+6.5vw,7rem)]">
                    <div
                        className="eco-noise eco-rim eco-rim-on relative overflow-hidden rounded-4xl bg-primary px-5 py-10 text-primary-foreground sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-14"
                        data-reveal="clip"
                        data-reveal-distance="lg"
                        style={
                            { '--reveal-clip-radius': '2rem' } as CSSProperties
                        }
                    >
                        <div
                            className="absolute -top-20 right-8 size-56 animate-float-slow rounded-full border-34 border-white/8"
                            data-parallax="0.09"
                            aria-hidden="true"
                        />
                        <div className="relative max-w-2xl">
                            <p className="text-xs font-semibold tracking-[.15em] uppercase opacity-75">
                                Mulai dari lingkungan terdekat
                            </p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance">
                                Satu setoran hari ini dapat memulai kebiasaan
                                baru.
                            </h2>
                            <p className="mt-3 leading-7 text-primary-foreground/78">
                                Daftar sebagai warga, lengkapi wilayah, lalu
                                ajukan pengumpulan pertama Anda.
                            </p>
                        </div>
                        <Button
                            asChild
                            size="lg"
                            variant="secondary"
                            className="relative mt-7 h-12 rounded-xl lg:mt-0"
                        >
                            <Link href="/register">
                                Buat akun warga
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </div>
        </>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="group rounded-2xl px-4 py-5 text-center transition-colors duration-400 ease-out-quint hover:bg-primary/6 sm:px-6 md:py-3">
            {/*
             * The sweep runs across the figure rather than cycling its colour,
             * so the number stays fully legible at every point in the loop.
             */}
            <p
                className="eco-metal-text text-xl font-bold tracking-tight sm:text-2xl"
                data-numeric=""
            >
                {value}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground transition-colors duration-400 group-hover:text-foreground">
                {label}
            </p>
        </div>
    );
}

function SectionHeading({
    title,
    description,
    link,
}: {
    title: string;
    description: string;
    link?: { label: string; href: string };
}) {
    return (
        <div
            className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
            data-reveal="up"
            data-reveal-distance="lg"
        >
            <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                    {title}
                </h2>
                <p className="mt-4 leading-7 text-muted-foreground">
                    {description}
                </p>
            </div>
            {link && (
                <Button asChild variant="outline">
                    <Link href={link.href}>
                        {link.label}
                        <ChevronRight aria-hidden="true" />
                    </Link>
                </Button>
            )}
        </div>
    );
}

function ProgramCard({ program }: { program: Program }) {
    const cover = publicAssetUrl(program.cover_url || program.cover_path);

    return (
        <article className="eco-card eco-card-interactive group overflow-hidden">
            <div className="relative aspect-video overflow-hidden bg-linear-to-br from-emerald-950 to-lime-950">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="grid size-full place-items-center">
                        <Sprout
                            className="size-14 text-primary/60"
                            aria-hidden="true"
                        />
                    </div>
                )}
                <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-primary backdrop-blur">
                    {program.type === 'ecopore'
                        ? 'EcoPore'
                        : program.type === 'ecocycle'
                          ? 'EcoCycle'
                          : 'Eco Village'}
                </span>
            </div>
            <div className="p-5">
                <h3 className="line-clamp-2 text-lg font-semibold">
                    {program.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {program.description}
                </p>
                <Link
                    href={`/program/${program.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                    Lihat program{' '}
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

function EducationCard({ content }: { content: EducationContent }) {
    const cover = publicAssetUrl(content.cover_url || content.cover_path);

    return (
        <article className="eco-card eco-card-interactive group overflow-hidden">
            <div className="aspect-16/10 overflow-hidden bg-secondary">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="grid size-full place-items-center">
                        <BookOpen
                            className="size-12 text-primary/60"
                            aria-hidden="true"
                        />
                    </div>
                )}
            </div>
            <div className="p-5">
                <p className="text-xs font-semibold text-primary">
                    {namedValue(content.category, 'Edukasi')}
                </p>
                <h3 className="mt-2 line-clamp-2 leading-6 font-semibold">
                    {content.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {content.excerpt}
                </p>
                <Link
                    href={`/edukasi/${content.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                    Baca materi{' '}
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

function ProductCard({ product }: { product: Product }) {
    const image =
        product.image_url || publicAssetUrl(product.images?.[0]?.path);

    return (
        <article className="eco-card eco-card-interactive group min-w-0 overflow-hidden">
            <div className="aspect-square bg-muted">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="grid size-full place-items-center">
                        <ShoppingBag
                            className="size-10 text-primary/50"
                            aria-hidden="true"
                        />
                    </div>
                )}
            </div>
            <div className="p-4">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="mt-1 text-xs font-semibold text-amber-300">
                    {formatPoints(product.point_price)}
                </p>
            </div>
        </article>
    );
}

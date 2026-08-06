import { Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Coins, ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { PublicBackground } from '@/components/public-background';
import { Button } from '@/components/ui/button';
import type { AuthLayoutProps } from '@/types';

const highlights = [
    { icon: CheckCircle2, label: 'Status pengumpulan dapat dipantau' },
    { icon: Coins, label: 'Poin berasal dari berat terverifikasi' },
    { icon: ShieldCheck, label: 'Lokasi rumah tidak dipublikasikan' },
];

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        // `isolate` menahan lapisan background agar tidak tertutup latar
        // `body`, sama seperti pada layout publik.
        <div className="relative isolate grid min-h-dvh lg:grid-cols-[.95fr_1.05fr]">
            <PublicBackground />

            {/*
             * Panel brand kini semi-transparan supaya foto latar ikut terbaca
             * di belakangnya, tetapi tetap cukup pekat untuk teks putih.
             */}
            <aside className="eco-noise relative z-10 hidden overflow-hidden bg-[#0b251b]/92 p-10 text-white backdrop-blur-sm lg:flex lg:flex-col xl:p-14">
                <Link
                    href="/"
                    className="relative z-10 flex items-center gap-2 font-display text-lg font-bold transition-transform duration-300 ease-out-quint hover:scale-[1.02]"
                    aria-label="EcoVillage.id, beranda"
                >
                    <AppLogoIcon className="size-10 text-lime-300" />
                    <span>
                        EcoVillage<span className="text-lime-300">.id</span>
                    </span>
                </Link>

                <div
                    className="relative z-10 my-auto max-w-lg py-16"
                    data-reveal-group="up"
                    data-reveal-step="85"
                >
                    <h2 className="text-4xl leading-tight font-bold tracking-tight text-balance xl:text-5xl">
                        Kontribusi kecil, tercatat menjadi gerakan warga.
                    </h2>
                    <p className="mt-5 leading-7 text-emerald-100/72">
                        Akses pengumpulan sampah, Green Points, program EcoPore
                        dan EcoCycle, serta estimasi dampak dari satu akun.
                    </p>
                    <ul
                        className="mt-8 space-y-4 text-sm text-emerald-50/90"
                        data-reveal-group="left"
                        data-reveal-distance="sm"
                        data-reveal-step="90"
                    >
                        {highlights.map((highlight) => (
                            <li
                                key={highlight.label}
                                className="flex items-center gap-3"
                            >
                                <highlight.icon
                                    className="size-5 shrink-0 text-lime-300"
                                    aria-hidden="true"
                                />
                                {highlight.label}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            <main className="relative z-10 flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
                {/*
                 * An explicit way out of the auth flow. On the wide layout the
                 * marketing panel carries the only link home, and it is hidden
                 * below `lg`, so without this a visitor on a phone had no route
                 * back to the site once they landed on a form.
                 */}
                <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2 sm:inset-x-6">
                    {/*
                     * Kontrol ini melayang langsung di atas foto latar, jadi ia
                     * memakai chip frosted agar keterbacaannya tidak bergantung
                     * pada terang-gelap gambar di belakangnya.
                     */}
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="group rounded-full bg-background/70 text-muted-foreground backdrop-blur-sm hover:bg-background/85 hover:text-foreground"
                    >
                        <Link href="/">
                            <ArrowLeft
                                className="transition-transform duration-300 ease-out-quint group-hover:-translate-x-0.5"
                                aria-hidden="true"
                            />
                            Kembali ke beranda
                        </Link>
                    </Button>
                </div>

                <div className="relative w-full max-w-md pt-12 sm:pt-8">
                    <Link
                        href="/"
                        className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full bg-background/70 px-4 py-1.5 font-display font-bold backdrop-blur-sm transition-transform duration-300 ease-out-quint hover:scale-[1.02] lg:hidden"
                    >
                        <AppLogoIcon className="size-10 text-primary" />
                        <span>
                            EcoVillage<span className="text-primary">.id</span>
                        </span>
                    </Link>

                    {/*
                     * The rim lights while any field inside holds focus, which
                     * gives the whole card a single, calm "active" state rather
                     * than each input announcing itself separately.
                     */}
                    <div
                        // Kartu di-frost, bukan dibuat opaque: foto latar tetap
                        // terasa sementara kontras teks form tetap aman.
                        className="eco-rim rounded-[1.75rem] border bg-card/88 p-5 shadow-eco-lg backdrop-blur-xl transition-shadow duration-500 sm:p-8"
                        data-reveal="scale"
                    >
                        <div className="mb-7">
                            <h1 className="text-2xl font-bold tracking-tight text-balance">
                                {title}
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {description}
                            </p>
                        </div>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

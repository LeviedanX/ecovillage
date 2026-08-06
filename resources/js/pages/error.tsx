import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Compass, LifeBuoy, RefreshCw, Search } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';

type Props = {
    status: number;
};

const messages: Record<
    number,
    { title: string; description: string; retry?: boolean }
> = {
    403: {
        title: 'Halaman ini tidak dapat Anda akses',
        description:
            'Akun Anda tidak memiliki kewenangan untuk membuka halaman tersebut. Hubungi pengelola bila Anda merasa ini keliru.',
    },
    404: {
        title: 'Halaman tidak ditemukan',
        description:
            'Alamat yang Anda buka sudah dipindahkan, dihapus, atau tidak pernah ada. Periksa kembali tautannya.',
    },
    419: {
        title: 'Sesi Anda telah berakhir',
        description:
            'Demi keamanan, sesi ditutup setelah tidak digunakan beberapa lama. Muat ulang halaman lalu coba lagi.',
        retry: true,
    },
    429: {
        title: 'Terlalu banyak permintaan',
        description:
            'Permintaan dari perangkat Anda dibatasi sementara. Tunggu sejenak sebelum mencoba kembali.',
        retry: true,
    },
    500: {
        title: 'Terjadi gangguan pada server',
        description:
            'Kesalahan ini sudah tercatat pada sistem kami. Silakan coba beberapa saat lagi.',
        retry: true,
    },
    503: {
        title: 'Layanan sedang dalam perawatan',
        description:
            'EcoVillage.id sedang diperbarui dan akan segera kembali normal. Terima kasih atas kesabaran Anda.',
        retry: true,
    },
};

const shortcuts = [
    { href: '/program', icon: Compass, label: 'Program warga' },
    { href: '/edukasi', icon: LifeBuoy, label: 'Materi edukasi' },
    { href: '/katalog', icon: Search, label: 'Katalog produk' },
];

export default function ErrorPage({ status }: Props) {
    const message = messages[status] ?? {
        title: 'Terjadi kesalahan',
        description:
            'Permintaan Anda tidak dapat diselesaikan. Silakan kembali ke beranda dan coba lagi.',
    };

    return (
        <>
            <Head title={`${status} — ${message.title}`} />

            <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background">
                <div className="eco-grid-bg absolute inset-0 -z-20 opacity-40" />
                <div className="absolute -top-32 -right-24 -z-10 size-112 max-w-[140vw] animate-float-slow rounded-full bg-emerald-800/20 blur-3xl" />

                <header className="eco-container flex h-16 shrink-0 items-center justify-between gap-3 lg:h-18">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-display font-bold transition-transform duration-300 ease-out-quint hover:scale-[1.02]"
                        aria-label="EcoVillage.id, beranda"
                    >
                        <AppLogoIcon className="size-9 text-primary" />
                        <span>
                            EcoVillage<span className="text-primary">.id</span>
                        </span>
                    </Link>
                </header>

                <div className="eco-container flex max-w-3xl flex-1 flex-col justify-center py-12 text-center sm:py-16">
                    <p
                        className="font-display text-6xl font-extrabold tracking-tight text-primary/25 sm:text-7xl"
                        aria-hidden="true"
                        data-reveal="scale"
                    >
                        {status}
                    </p>
                    <h1
                        className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
                        data-reveal="up"
                    >
                        {message.title}
                    </h1>
                    <p
                        className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        {message.description}
                    </p>

                    <div
                        className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
                        data-reveal-group="up"
                        data-reveal-distance="sm"
                    >
                        <Button
                            asChild
                            size="lg"
                            className="group h-12 rounded-xl px-6"
                        >
                            <Link href="/">
                                <ArrowLeft
                                    className="transition-transform duration-300 ease-out-quint group-hover:-translate-x-0.5"
                                    aria-hidden="true"
                                />
                                Kembali ke beranda
                            </Link>
                        </Button>
                        {message.retry && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-12 rounded-xl px-6"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCw aria-hidden="true" />
                                Muat ulang halaman
                            </Button>
                        )}
                    </div>

                    <div className="mt-12 border-t pt-8">
                        <p className="text-sm text-muted-foreground">
                            Atau lanjutkan ke bagian lain:
                        </p>
                        <div
                            className="mt-4 flex flex-wrap justify-center gap-2"
                            data-reveal-group="up"
                            data-reveal-distance="sm"
                        >
                            {shortcuts.map((shortcut) => (
                                <Link
                                    key={shortcut.href}
                                    href={shortcut.href}
                                    className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-300 ease-out-quint hover:-translate-y-0.5 hover:border-primary/35 hover:text-foreground active:scale-95"
                                >
                                    <shortcut.icon
                                        className="size-4 text-primary"
                                        aria-hidden="true"
                                    />
                                    {shortcut.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

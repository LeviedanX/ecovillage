import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import { BackToTop } from '@/components/back-to-top';
import { PublicBackground } from '@/components/public-background';
import { ScrollProgress } from '@/components/scroll-progress';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';

const navigation = [
    { label: 'Tentang', href: '/tentang' },
    { label: 'Program', href: '/program' },
    { label: 'Edukasi', href: '/edukasi' },
    { label: 'Peta Dampak', href: '/peta' },
    { label: 'Katalog', href: '/katalog' },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
    const page = usePage();
    const { auth } = page.props;
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const scrolled = useScrolled(16);

    return (
        // `isolate` membuat wrapper ini menjadi stacking context sendiri,
        // sehingga urutan lapisan background dan konten dapat dikendalikan
        // penuh tanpa bergantung pada latar `body` di atasnya.
        <div className="relative isolate flex min-h-dvh flex-col">
            <PublicBackground />
            <a
                href="#konten-utama"
                className="fixed top-2 left-2 z-110 -translate-y-20 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-transform duration-300 ease-out-quint focus:translate-y-0"
            >
                Lewati ke konten
            </a>

            <header
                className={cn(
                    'sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out-quint',
                    scrolled
                        ? 'border-border bg-background/85 shadow-eco backdrop-blur-xl supports-backdrop-filter:bg-background/72'
                        : 'bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-md',
                )}
            >
                <div
                    className={cn(
                        'eco-container flex items-center gap-3 transition-[height] duration-500 ease-out-quint sm:gap-4',
                        scrolled ? 'h-14 lg:h-16' : 'h-16 lg:h-18',
                    )}
                >
                    <Link
                        href="/"
                        className="flex min-w-0 shrink items-center transition-transform duration-300 ease-out-quint hover:scale-[1.02] active:scale-[0.98]"
                        aria-label="EcoVillage.id, beranda"
                    >
                        <AppLogo />
                    </Link>

                    <nav
                        className="ml-auto hidden items-center gap-0.5 lg:flex"
                        aria-label="Navigasi utama"
                    >
                        {navigation.map((item) => {
                            const active = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'group relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300',
                                        active
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'absolute inset-0 -z-10 rounded-lg bg-secondary transition-all duration-400 ease-out-quint',
                                            active
                                                ? 'scale-100 opacity-100'
                                                : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100',
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.label}
                                    <span
                                        className={cn(
                                            'absolute inset-x-3 -bottom-px h-0.5 origin-center rounded-full bg-primary transition-transform duration-400 ease-out-quint',
                                            active
                                                ? 'scale-x-100'
                                                : 'scale-x-0',
                                        )}
                                        aria-hidden="true"
                                    />
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-3">
                        <div className="hidden items-center gap-2 sm:flex">
                            {auth.user ? (
                                <Button asChild className="group eco-lift">
                                    <Link href="/dashboard">
                                        <span className="hidden md:inline">
                                            Buka dashboard
                                        </span>
                                        <span className="md:hidden">
                                            Dashboard
                                        </span>
                                        <ChevronRight
                                            aria-hidden="true"
                                            className="transition-transform duration-300 group-hover:translate-x-0.5"
                                        />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild variant="ghost">
                                        <Link href="/login">Masuk</Link>
                                    </Button>
                                    <Button asChild className="eco-lift">
                                        <Link href="/register">
                                            <span className="hidden md:inline">
                                                Mulai berkontribusi
                                            </span>
                                            <span className="md:hidden">
                                                Daftar
                                            </span>
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                    aria-label="Buka menu"
                                >
                                    <Menu aria-hidden="true" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="flex w-[min(88vw,22rem)] flex-col px-6"
                            >
                                <SheetTitle className="mt-2 flex items-center">
                                    <AppLogo />
                                </SheetTitle>
                                <nav
                                    className="mt-8 flex flex-col gap-1"
                                    aria-label="Navigasi seluler"
                                    data-reveal-group="up"
                                    data-reveal-distance="sm"
                                    data-reveal-step="45"
                                >
                                    {navigation.map((item) => {
                                        const active = isCurrentOrParentUrl(
                                            item.href,
                                        );

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                                className={cn(
                                                    'flex items-center justify-between rounded-xl px-4 py-3 font-medium transition-colors duration-300 active:scale-[0.99]',
                                                    active
                                                        ? 'bg-secondary text-primary'
                                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                                                )}
                                            >
                                                {item.label}
                                                <ChevronRight
                                                    className="size-4 opacity-50"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        );
                                    })}
                                </nav>
                                <div className="mt-6 grid gap-2 border-t pt-6 sm:hidden">
                                    <Button asChild>
                                        <Link
                                            href={
                                                auth.user
                                                    ? '/dashboard'
                                                    : '/register'
                                            }
                                        >
                                            {auth.user
                                                ? 'Buka dashboard'
                                                : 'Mulai berkontribusi'}
                                        </Link>
                                    </Button>
                                    {!auth.user && (
                                        <Button asChild variant="outline">
                                            <Link href="/login">Masuk</Link>
                                        </Button>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                <ScrollProgress />
            </header>

            <main
                id="konten-utama"
                className="relative z-10 flex-1"
                key={page.component}
                data-page-transition=""
            >
                {children}
            </main>

            <footer className="relative z-10 border-t bg-[#0b251b] text-emerald-50">
                <div
                    className="eco-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-16"
                    data-reveal-group="up"
                    data-reveal-distance="sm"
                >
                    <div>
                        <div className="flex items-center [&_span]:text-white">
                            <AppLogo />
                        </div>
                    </div>
                    <FooterGroup
                        title="Jelajahi"
                        links={navigation.slice(0, 3)}
                    />
                    <FooterGroup
                        title="Transparansi"
                        links={[
                            {
                                label: 'Metodologi dampak',
                                href: '/metodologi-dampak',
                            },
                            {
                                label: 'Privasi peta',
                                href: '/kebijakan-privasi',
                            },
                            { label: 'FAQ', href: '/faq' },
                        ]}
                    />
                    <FooterGroup
                        title="Terhubung"
                        links={[
                            { label: 'Kontak pengelola', href: '/kontak' },
                            { label: 'EcoPore', href: '/program?type=ecopore' },
                            {
                                label: 'EcoCycle',
                                href: '/program?type=ecocycle',
                            },
                        ]}
                    />
                </div>
                <div className="border-t border-white/10">
                    <div className="eco-container flex flex-col gap-2 py-5 text-xs text-emerald-100/65 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            &copy; {new Date().getFullYear()} Eco Village.
                            Dikelola bersama komunitas.
                        </p>
                    </div>
                </div>
            </footer>

            <BackToTop />
        </div>
    );
}

function FooterGroup({
    title,
    links,
}: {
    title: string;
    links: Array<{ label: string; href: string }>;
}) {
    return (
        <div>
            <p className="font-display text-sm font-semibold text-white">
                {title}
            </p>
            <ul className="mt-4 space-y-3 text-sm text-emerald-100/70">
                {links.map((link) => (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            className="eco-underline inline-block transition-colors duration-300 hover:text-white"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

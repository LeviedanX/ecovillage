import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { History, Home, Map, PlusCircle, UserRound } from 'lucide-react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useScrolled, useScrollDirection } from '@/hooks/use-scrolled';
import { isManagerRole, isStaffRole, userRoles } from '@/lib/ecovillage';
import { cn } from '@/lib/utils';

const items = [
    { label: 'Beranda', href: '/dashboard', icon: Home },
    { label: 'Setor/Lapor', href: '/pengumpulan/buat', icon: PlusCircle },
    { label: 'Peta', href: '/peta', icon: Map },
    { label: 'Riwayat', href: '/pengumpulan', icon: History },
    { label: 'Profil', href: '/settings/profile', icon: UserRound },
];

const operationsItems = [
    { label: 'Beranda', href: '/dashboard', icon: Home },
    { label: 'Tugas', href: '/operasional/pengumpulan', icon: History },
    { label: 'Peta tugas', href: '/operasional/peta', icon: Map },
    { label: 'Kegiatan', href: '/kegiatan', icon: PlusCircle },
    { label: 'Profil', href: '/settings/profile', icon: UserRound },
];

export function MobileAppNav() {
    const { auth } = usePage().props;
    const roles = userRoles(auth.user);
    const operational = isManagerRole(roles) || isStaffRole(roles);
    const navigationItems = operational ? operationsItems : items;
    const { isCurrentOrParentUrl, currentUrl } = useCurrentUrl();

    const direction = useScrollDirection();
    const pastFold = useScrolled(180);
    // Give the content the full screen while reading downwards.
    const tucked = pastFold && direction === 'down';

    return (
        <nav
            className={cn(
                'fixed inset-x-0 bottom-0 z-40 border-t bg-background/92 px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-24px_rgba(0,0,0,.6)] backdrop-blur-lg transition-transform duration-500 ease-out-quint md:hidden',
                tucked
                    ? 'translate-y-[calc(100%+env(safe-area-inset-bottom))]'
                    : 'translate-y-0',
            )}
            aria-label="Navigasi aplikasi"
        >
            <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
                {navigationItems.map((item) => {
                    const active =
                        item.href === '/dashboard'
                            ? currentUrl === item.href
                            : isCurrentOrParentUrl(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            className={cn(
                                'group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors duration-300 active:scale-95',
                                active
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                            )}
                            aria-current={active ? 'page' : undefined}
                        >
                            <span
                                className={cn(
                                    'absolute top-1 h-0.5 rounded-full bg-primary transition-all duration-400 ease-out-quint',
                                    active
                                        ? 'w-6 opacity-100'
                                        : 'w-0 opacity-0',
                                )}
                                aria-hidden="true"
                            />
                            <span
                                className={cn(
                                    'absolute inset-x-2 inset-y-1 -z-10 rounded-xl bg-secondary/70 transition-all duration-400 ease-out-quint',
                                    active
                                        ? 'scale-100 opacity-100'
                                        : 'scale-75 opacity-0',
                                )}
                                aria-hidden="true"
                            />
                            <item.icon
                                className={cn(
                                    'size-5 transition-transform duration-400 ease-spring',
                                    active
                                        ? '-translate-y-0.5 scale-110'
                                        : 'group-active:scale-90',
                                )}
                                aria-hidden="true"
                            />
                            <span className="max-w-full truncate">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

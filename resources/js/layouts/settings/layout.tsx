import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profil',
        href: '/settings/profile',
        icon: null,
    },
    {
        title: 'Alamat & lokasi',
        href: '/settings/addresses',
        icon: null,
    },
    {
        title: 'Keamanan',
        href: '/settings/security',
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
            <Heading
                title="Pengaturan akun"
                description="Kelola profil, alamat, keamanan, dan tampilan aplikasi"
            />

            <div className="flex flex-col lg:flex-row lg:gap-12">
                {/*
                 * A swipeable tab strip on small screens, a vertical rail from
                 * `lg` up — same links, laid out for the space available.
                 */}
                <aside className="w-full lg:w-52 lg:shrink-0">
                    <nav
                        className="eco-scroll-x flex gap-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
                        aria-label="Pengaturan akun"
                        data-reveal-group="left"
                        data-reveal-distance="sm"
                        data-reveal-step="45"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const active = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={`${toUrl(item.href)}-${index}`}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out-quint active:scale-[0.97] lg:w-full lg:shrink',
                                        active
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                    )}
                                >
                                    {item.icon && (
                                        <item.icon
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {item.title}
                                    <span
                                        className={cn(
                                            'absolute rounded-full bg-primary transition-all duration-400 ease-out-quint',
                                            'inset-x-3 bottom-0 h-0.5 lg:inset-x-auto lg:inset-y-2 lg:left-0 lg:h-auto lg:w-0.5',
                                            active
                                                ? 'scale-100 opacity-100'
                                                : 'scale-50 opacity-0',
                                        )}
                                        aria-hidden="true"
                                    />
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="min-w-0 flex-1">
                    {/*
                     * Each settings block is a direct child here, so the group
                     * staggers them without any page needing to opt in.
                     */}
                    <section
                        className="max-w-xl space-y-10 sm:space-y-12"
                        data-reveal-group="up"
                        data-reveal-distance="sm"
                        data-reveal-step="70"
                    >
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}

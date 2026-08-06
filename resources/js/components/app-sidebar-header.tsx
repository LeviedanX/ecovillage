import { Link, usePage } from '@inertiajs/react';
import { Bell, Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;
    const scrolled = useScrolled(8);
    const unreadNotifications =
        typeof auth.user?.unread_notifications === 'number'
            ? auth.user.unread_notifications
            : 0;

    return (
        <header
            className={cn(
                'sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b px-3 transition-all duration-500 ease-out-quint group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 sm:px-4 md:px-6',
                scrolled
                    ? 'h-14 border-sidebar-border/70 bg-background/80 shadow-eco backdrop-blur-xl'
                    : 'h-16 border-transparent bg-background/95 backdrop-blur-md',
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1 transition-transform duration-300 hover:scale-105 active:scale-95" />
                {/* Breadcrumbs need horizontal room, so they wait for ≥sm. */}
                <div className="hidden min-w-0 sm:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Link href="/pencarian" aria-label="Cari di EcoVillage.id">
                        <Search aria-hidden="true" />
                    </Link>
                </Button>
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="relative transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Link href="/notifikasi" aria-label="Buka notifikasi">
                        <Bell aria-hidden="true" />
                        {unreadNotifications > 0 && (
                            <>
                                <span
                                    className="absolute top-1.5 right-1.5 size-4 animate-pulse-ring rounded-full bg-destructive/70"
                                    aria-hidden="true"
                                />
                                <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground ring-2 ring-background">
                                    <span className="sr-only">
                                        Notifikasi belum dibaca:{' '}
                                    </span>
                                    {unreadNotifications > 99
                                        ? '99+'
                                        : unreadNotifications}
                                </span>
                            </>
                        )}
                    </Link>
                </Button>
            </div>
        </header>
    );
}

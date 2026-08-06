import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { BackToTop } from '@/components/back-to-top';
import { MobileAppNav } from '@/components/mobile-app-nav';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const page = usePage();

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/*
                 * Keyed on the page component so a genuine navigation replays the
                 * entrance, while partial reloads on the same page (filters,
                 * pagination with preserved state) leave the tree untouched.
                 */}
                <div
                    key={page.component}
                    data-page-transition=""
                    className="min-w-0 flex-1"
                >
                    {children}
                </div>
            </AppContent>
            <MobileAppNav />
            {/* Lifted clear of the mobile tab bar, which owns the bottom edge. */}
            <BackToTop className="bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6" />
        </AppShell>
    );
}

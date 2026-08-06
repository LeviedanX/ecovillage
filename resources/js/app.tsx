import { createInertiaApp } from '@inertiajs/react';
import { PwaStatus } from '@/components/pwa-status';
import { RevealProvider } from '@/components/reveal-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'EcoVillage.id';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            /*
             * Error pages are self-contained. A 404 is thrown by the router
             * before the web middleware runs, so Inertia's shared props —
             * including `auth` — are absent, and any layout that reads them
             * would crash on the very page meant to recover from a crash.
             */
            case name === 'error':
                return undefined;
            case name === 'welcome' || name.startsWith('public/'):
                return PublicLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <PwaStatus />
                <RevealProvider />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#237a4b',
    },
});

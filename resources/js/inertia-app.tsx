import type { ReactNode } from 'react';
import { PwaStatus } from '@/components/pwa-status';
import { RevealProvider } from '@/components/reveal-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings/layout';

/**
 * Konfigurasi Inertia yang dipakai bersama oleh entry peramban dan entry
 * server. Keduanya harus menghasilkan pohon komponen yang identik; perbedaan
 * sekecil apa pun membuat hidrasi React membuang markup hasil render server
 * dan menghapus manfaat SSR.
 */

/*
 * `VITE_APP_NAME="${APP_NAME}"` pada .env hanya diekspansi pada sebagian mode
 * Vite. Bila nilainya sampai ke sini masih berbentuk penanda, ia dibuang agar
 * judul halaman tidak pernah terbaca `Beranda - ${APP_NAME}`.
 */
const configuredName = import.meta.env.VITE_APP_NAME;
export const appName =
    typeof configuredName === 'string' && !configuredName.includes('${')
        ? configuredName
        : 'EcoVillage.id';

export const resolvePageTitle = (title: string): string =>
    title ? `${title} - ${appName}` : appName;

export const resolveLayout = (name: string) => {
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
};

/**
 * Pembungkus aplikasi, dipakai apa adanya oleh entry peramban maupun entry
 * server. Adapter memanggilnya dengan penanda `ssr`, sehingga satu fungsi ini
 * menjamin kedua pohon komponen identik kecuali pada bagian yang memang tidak
 * boleh dirender di server.
 *
 * `PwaStatus` mendaftarkan service worker dan hanya bermakna di peramban.
 * Komponen lain aman karena seluruh sentuhan DOM-nya berada di dalam efek.
 */
export function withApp(
    app: ReactNode,
    { ssr = false }: { ssr?: boolean } = {},
) {
    return (
        <TooltipProvider delayDuration={0}>
            {app}
            <Toaster />
            {!ssr && <PwaStatus />}
            <RevealProvider />
        </TooltipProvider>
    );
}

import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                // Body / UI face.
                bunny('Instrument Sans', {
                    weights: [400, 500, 600, 700],
                    preload: false,
                }),
                // Display face for headings — geometric humanist, pairs with the body face.
                bunny('Plus Jakarta Sans', {
                    weights: [600, 700, 800],
                    variable: '--font-display-face',
                    preload: false,
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'resources/js',
            filename: 'sw.ts',
            registerType: 'prompt',
            injectRegister: null,
            includeAssets: [
                'icon/logo.png',
                'favicon.ico',
                'apple-touch-icon.png',
                'pwa-192.png',
                'pwa-512.png',
                'pwa-maskable.png',
                'offline.html',
            ],
            manifest: {
                id: '/',
                name: 'EcoVillage.id',
                short_name: 'EcoVillage',
                description:
                    'Platform gotong royong pengelolaan sampah dan program lingkungan Eco Village.',
                lang: 'id',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#f7f8f1',
                theme_color: '#237a4b',
                categories: ['lifestyle', 'education', 'utilities'],
                icons: [
                    {
                        src: '/pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
});

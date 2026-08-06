import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ isSsrBuild }) => ({
    /*
     * Bundle SSR dibuat mandiri. Secara baku Vite membiarkan dependency tetap
     * eksternal, sehingga berkas hasil build menuntut `node_modules` ada di
     * samping proses dan React ter-resolve ke build development yang jauh
     * lebih lambat. Dengan seluruh dependency ikut dibundel, image SSR cukup
     * berisi Node dan satu berkas, dan React yang terpakai dipastikan build
     * production.
     *
     * Hanya berlaku pada `vite build --ssr`. Di dev, `@inertiajs/vite`
     * menjalankan entry SSR lewat module runner Vite, dan module runner itu
     * mengeksekusi setiap berkas sebagai ESM. Memaksa dependency ikut masuk ke
     * sana membuat paket CommonJS seperti `react` dan `react-dom/server`
     * dievaluasi sebagai ESM, lalu gagal pada `module is not defined`. Dengan
     * dibiarkan eksternal, Node yang meng-`import` paket itu dan interop CJS-nya
     * bekerja normal.
     */
    ssr: isSsrBuild ? { noExternal: true } : {},
    /*
     * Tanpa `strictPort`, `npm run dev` kedua yang dijalankan sementara yang
     * pertama masih hidup tidak gagal: ia pindah ke 5174 dan menimpa
     * `public/hot`. Halaman lalu memuat aset dari satu server sementara HMR
     * memegang token milik server lain, dan Vite menolak koneksi WebSocket-nya
     * — HTTP tetap jalan, HMR mati tanpa penjelasan. Lebih baik proses kedua
     * berhenti seketika dengan pesan port terpakai.
     *
     * Host dikunci ke 127.0.0.1 karena `localhost` di Windows ter-resolve ke
     * ::1, sehingga `public/hot` berisi `http://[::1]:5173` dan tidak ada yang
     * mendengarkan di 127.0.0.1. Saat koneksi ke alamat IPv6 gagal, peramban
     * mencoba `ws://localhost:5173` sebagai cadangan dan ikut gagal karena
     * memang tidak ada soket di sana.
     */
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            // Bundle SSR dibangun `npm run build:ssr` ke bootstrap/ssr, lalu
            // dijalankan `php artisan inertia:start-ssr` di production.
            ssr: 'resources/js/ssr.tsx',
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
}));

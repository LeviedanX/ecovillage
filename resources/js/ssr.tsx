import type { PageProps } from '@inertiajs/core';
import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';
import { resolveLayout, resolvePageTitle, withApp } from '@/inertia-app';

/**
 * Entry render sisi server. Prosesnya dijalankan `php artisan inertia:start-ssr`
 * pada pengembangan, atau langsung `node bootstrap/ssr/ssr.js` pada image SSR,
 * dan menerima payload halaman dari aplikasi lalu mengembalikan HTML jadi.
 *
 * Tanpa ini, permintaan pertama hanya mengirim cangkang kosong: crawler yang
 * tidak menjalankan JavaScript, termasuk pratinjau tautan WhatsApp dan
 * Facebook, tidak melihat isi apa pun, dan pengguna menatap layar kosong
 * sampai bundle selesai diunduh serta dijalankan.
 *
 * Bila proses ini mati, `Inertia\Ssr\HttpGateway` mengembalikan null dan
 * aplikasi jatuh ke render sisi peramban. Halaman tetap berfungsi, hanya
 * kehilangan HTML awal untuk crawler.
 */

/*
 * Dipanggil tanpa `page` dan `render`, adapter mengembalikan factory render
 * yang menyusun pohon komponen dengan cara yang sama persis seperti entry
 * peramban, termasuk StrictMode dan `withApp`. Menyerahkan penyusunan itu ke
 * adapter, alih-alih merakitnya sendiri lewat `setup`, adalah yang menjaga
 * markup server dan klien tetap identik sehingga hidrasi tidak membuangnya.
 *
 * Parameter generiknya disetel ke `PageProps` dasar agar cocok dengan payload
 * yang diberikan `createServer`. Props bersama tetap sampai ke komponen lewat
 * `usePage()`, yang tipenya diperluas pada `types/global.d.ts`.
 *
 * Aplikasi dibangun sekali di luar handler agar tidak dirakit ulang pada
 * setiap permintaan render.
 */
const application = createInertiaApp<PageProps>({
    title: resolvePageTitle,
    layout: resolveLayout,
    strictMode: true,
    withApp,
});

createServer(async (page) => {
    const render = await application;

    /*
     * Adapter mengembalikan factory render hanya pada jalur server. Kalau
     * suatu saat jalurnya berubah, lebih baik proses ini berhenti dengan pesan
     * yang jelas daripada diam-diam mengembalikan halaman kosong ke crawler.
     */
    if (typeof render !== 'function') {
        throw new TypeError(
            'Inertia tidak mengembalikan factory render sisi server. Periksa entry SSR.',
        );
    }

    return render(page, ReactDOMServer.renderToString);
});

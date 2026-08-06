import { expect, test } from '@playwright/test';

/*
 * Yang diperiksa di sini adalah HTML mentah, tanpa menjalankan JavaScript sama
 * sekali: persis seperti yang diterima crawler non-Google dan pratinjau tautan
 * WhatsApp, Facebook, maupun Telegram.
 *
 * `request` pada Playwright adalah klien HTTP biasa, bukan peramban, sehingga
 * kegagalan render sisi server langsung terlihat di sini alih-alih tertutupi
 * oleh JavaScript yang tetap berjalan di tab.
 */

const strip = (html: string): string =>
    html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const meta = (html: string, key: string): string | null => {
    const pattern = new RegExp(
        `<meta[^>]*(?:name|property)="${key}"[^>]*content="([^"]*)"`,
        'i',
    );

    return pattern.exec(html)?.[1] ?? null;
};

const pages = [
    { path: '/', heading: /Aksi lingkungan warga/i },
    { path: '/tentang', heading: /Program lingkungan/i },
    { path: '/edukasi', heading: /Belajar mengelola sampah/i },
    { path: '/program', heading: /./ },
    { path: '/peta', heading: /./ },
];

for (const page of pages) {
    test(`HTML awal ${page.path} sudah berisi konten dan metadata`, async ({
        request,
    }) => {
        const response = await request.get(page.path);
        expect(response.status()).toBe(200);

        const html = await response.text();

        // Isi halaman harus ada tanpa JavaScript.
        expect(html).toMatch(/<h1[\s>]/);
        expect(strip(html).length).toBeGreaterThan(500);
        expect(strip(html)).toMatch(page.heading);

        // Judul wajib spesifik per halaman, bukan nama aplikasi saja.
        const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
        expect(title).toContain('EcoVillage.id');
        expect(title.length).toBeGreaterThan('EcoVillage.id'.length);
        expect(title).not.toContain('${');

        expect(meta(html, 'description')?.length ?? 0).toBeGreaterThan(30);
        expect(meta(html, 'og:title')).toBeTruthy();
        expect(meta(html, 'og:description')).toBeTruthy();
        expect(meta(html, 'og:image')).toMatch(/^https?:\/\//);
        expect(meta(html, 'og:site_name')).toBe('EcoVillage.id');
        expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+"/);
    });
}

test('judul halaman berbeda antar halaman', async ({ request }) => {
    const titles = await Promise.all(
        ['/', '/tentang', '/edukasi', '/peta'].map(async (path) => {
            const html = await (await request.get(path)).text();

            return /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
        }),
    );

    expect(new Set(titles).size).toBe(titles.length);
});

test('sitemap dan robots dapat diambil crawler', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();

    const xml = await sitemap.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/edukasi');

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();

    const body = await robots.text();
    expect(body).toContain('Sitemap: ');
    expect(body).toContain('Disallow: /admin');
});

test('halaman artikel edukasi membawa data terstruktur', async ({
    request,
}) => {
    const index = await (await request.get('/edukasi')).text();
    const link = /href="(\/edukasi\/[^"]+)"/.exec(index)?.[1];

    test.skip(!link, 'Belum ada materi edukasi terbit pada data demo.');

    const html = await (await request.get(link as string)).text();
    const jsonLd =
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i.exec(
            html,
        )?.[1];

    expect(jsonLd, 'Artikel tidak menyertakan JSON-LD').toBeTruthy();

    const data = JSON.parse(jsonLd as string);
    expect(data['@type']).toBe('Article');
    expect(data.headline).toBeTruthy();
});

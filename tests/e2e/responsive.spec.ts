import { expect, test } from '@playwright/test';

const viewports = [
    { name: 'mobile-360', width: 360, height: 800 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
    test(`${viewport.name}: halaman publik utama tidak overflow atau error`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize(viewport);
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        page.on('console', (message) => {
            if (message.type() === 'error') {
                consoleErrors.push(message.text());
            }
        });
        page.on('pageerror', (error) => pageErrors.push(error.message));

        for (const path of [
            '/',
            '/edukasi',
            '/program',
            '/peta',
            '/login',
            '/forgot-password',
            '/reset-password/token-contoh',
        ]) {
            await page.goto(path, { waitUntil: 'networkidle' });
            await expect(
                page.locator('main, [role="main"]').first(),
            ).toBeVisible();

            const overflow = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            }));
            expect(
                overflow.scrollWidth,
                `${path} overflow pada ${viewport.name}`,
            ).toBeLessThanOrEqual(overflow.clientWidth + 1);
        }

        await page.goto('/', { waitUntil: 'networkidle' });
        await page.screenshot({
            path: testInfo.outputPath(`${viewport.name}-home.png`),
            fullPage: true,
        });
        expect(pageErrors).toEqual([]);
        expect(consoleErrors).toEqual([]);
    });
}

/*
 * Seluruh viewport diperiksa dalam satu test dengan satu kali login. Login
 * dibatasi lima percobaan per menit untuk kombinasi email dan IP, sehingga
 * satu test per viewport akan menabrak throttle produksi dan gagal karena
 * pembatasan itu, bukan karena masalah layout.
 */
test('panel admin tetap responsif dan bebas error pada seluruh viewport', async ({
    page,
}, testInfo) => {
    test.setTimeout(300_000);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            consoleErrors.push(message.text());
        }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewportSize(viewports[0]);
    await page.goto('/login');
    await page.getByLabel('Alamat email').fill('admin@gmail.com');
    await page.getByLabel('Kata sandi', { exact: true }).fill('password');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);

    for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        for (const path of [
            '/admin/operations',
            '/admin/master-data',
            '/operasional/pengumpulan',
            '/notifikasi',
            '/pencarian?q=Eco',
        ]) {
            await page.goto(path, { waitUntil: 'networkidle' });
            await expect(
                page.locator('main, [role="main"]').first(),
            ).toBeVisible();

            const overflow = await page.evaluate(() => ({
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
            }));
            expect(
                overflow.scrollWidth,
                `${path} overflow pada ${viewport.name}`,
            ).toBeLessThanOrEqual(overflow.clientWidth + 1);
        }

        await page.goto('/admin/master-data', { waitUntil: 'networkidle' });
        await page.screenshot({
            path: testInfo.outputPath(`${viewport.name}-admin-master.png`),
            fullPage: true,
        });
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
});

/*
 * Produk hanya memiliki satu tema gelap: `app.css` menetapkan token dan
 * `color-scheme` pada `:root`, tanpa kelas `dark` maupun pengalih tampilan.
 * Yang diuji karena itu adalah tema yang benar-benar terpasang.
 */
test('tema gelap publik terpasang dan halaman tetap terbaca', async ({
    page,
}) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const theme = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const body = getComputedStyle(document.body);

        return {
            colorScheme: root.colorScheme,
            background: body.backgroundColor,
            color: body.color,
        };
    });

    expect(theme.colorScheme).toBe('dark');
    expect(theme.background).not.toBe(theme.color);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

/*
 * CSP tanpa `'unsafe-inline'` mudah membunuh fitur secara diam-diam. Peta
 * adalah kasus paling rapuh: MapLibre memuat modul dinamis, membuat worker
 * dari blob URL, dan menarik style dari origin lain. Test ini menuntut bukti
 * bahwa peta benar-benar terpasang, bukan sekadar halaman tanpa error.
 */
test('CSP terkirim dan tidak memblokir MapLibre pada peta publik', async ({
    page,
}) => {
    const violations: string[] = [];
    page.on('console', (message) => {
        if (
            message.type() === 'error' &&
            /content security policy/i.test(message.text())
        ) {
            violations.push(message.text());
        }
    });

    const response = await page.goto('/peta', { waitUntil: 'networkidle' });
    const policy = response?.headers()['content-security-policy'] ?? '';

    expect(policy).toContain("default-src 'self'");
    expect(policy).toMatch(/script-src [^;]*'nonce-/);
    expect(policy).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    expect(policy).toContain("worker-src 'self' blob:");

    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({
        timeout: 30_000,
    });
    expect(violations).toEqual([]);
});

test('manifest dan service worker produksi dapat diakses', async ({
    request,
}) => {
    const manifestResponse = await request.get('/build/manifest.webmanifest');
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe('EcoVillage.id');
    expect(manifest.lang).toBe('id');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const workerResponse = await request.get('/build/sw.js');
    expect(workerResponse.ok()).toBeTruthy();
    expect(await workerResponse.text()).toContain('public-education-pages-v1');
});

import { expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8000';
const password = 'password';
const accounts = {
    citizen: 'warga@gmail.com',
    manager: 'pengelola@gmail.com',
    officer: 'kader@gmail.com',
    admin: 'admin@gmail.com',
} as const;

const proofPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zb2YAAAAASUVORK5CYII=',
    'base64',
);

type RoleSession = {
    context: BrowserContext;
    page: Page;
};

async function createSession(
    browser: Browser,
    contexts: BrowserContext[],
): Promise<RoleSession> {
    const context = await browser.newContext({
        baseURL,
        locale: 'id-ID',
        timezoneId: 'Asia/Jakarta',
    });
    contexts.push(context);

    return { context, page: await context.newPage() };
}

async function login(page: Page, email: string): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Alamat email').fill(email);
    await page.getByLabel('Kata sandi', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

test('alur inti lintas role dari registrasi hingga penukaran poin', async ({
    browser,
}) => {
    test.setTimeout(180_000);
    const contexts: BrowserContext[] = [];

    try {
        /*
         * Pendaftaran tidak lagi memakai route Fortify dan tidak melakukan
         * login otomatis: alamat yang sudah terdaftar dan yang belum harus
         * berakhir pada halaman yang persis sama. Langkah ini memeriksa kedua
         * cabang itu lewat peramban, bukan hanya lewat test HTTP.
         */
        await test.step('registrasi berakhir netral untuk email baru maupun lama', async () => {
            const submit = async (email: string) => {
                const { page } = await createSession(browser, contexts);
                await page.goto('/register');
                await page
                    .getByLabel('Nama lengkap')
                    .fill('Warga Registrasi E2E');
                await page.getByLabel('Alamat email').fill(email);
                await page
                    .getByLabel('Kata sandi', { exact: true })
                    .fill('E2e-Aman-2026!');
                await page
                    .getByLabel('Konfirmasi kata sandi')
                    .fill('E2e-Aman-2026!');
                await page
                    .getByRole('button', { name: 'Buat akun', exact: true })
                    .click();

                await expect(page).toHaveURL(/\/register\/pending$/);
                await expect(
                    page.getByRole('heading', {
                        name: 'Periksa email Anda',
                        exact: true,
                    }),
                ).toBeVisible();

                return page.locator('main, [role="main"]').first().innerText();
            };

            const fresh = await submit('registrasi.e2e@gmail.com');
            const existing = await submit(accounts.citizen);

            expect(existing).toBe(fresh);
        });

        const citizen = await createSession(browser, contexts);
        await login(citizen.page, accounts.citizen);

        let collectionId = '';
        let requestNumber = '';

        await test.step('warga membuat permintaan pengumpulan', async () => {
            const page = citizen.page;
            await page.goto('/pengumpulan/buat');

            const desiredAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 16);
            await page.getByLabel('Jadwal yang diinginkan').fill(desiredAt);

            const wasteSelect = page.getByLabel('Jenis sampah 1', {
                exact: true,
            });
            const petOptionValue = await wasteSelect
                .locator('option')
                .filter({ hasText: 'Botol Plastik PET' })
                .getAttribute('value');

            if (!petOptionValue) {
                throw new Error('Opsi Botol Plastik PET tidak tersedia.');
            }

            await wasteSelect.selectOption(petOptionValue);
            await page.getByLabel('Estimasi berat (kg)').fill('4');
            await page
                .getByLabel('Catatan untuk petugas (opsional)')
                .fill('Permintaan alur inti Playwright.');

            const submit = page.getByRole('button', {
                name: 'Kirim permintaan',
                exact: true,
            });
            await expect(submit).toBeEnabled();
            await submit.click();
            await expect(page).toHaveURL(/\/pengumpulan\/\d+$/);

            const match = new URL(page.url()).pathname.match(
                /\/pengumpulan\/(\d+)$/,
            );

            if (!match) {
                throw new Error('ID permintaan tidak ditemukan dari URL.');
            }

            collectionId = match[1];
            requestNumber = (
                await page.getByRole('heading', { level: 1 }).innerText()
            ).trim();

            expect(requestNumber).toMatch(/^EV-/);
            await expect(
                page.getByText('Diajukan', { exact: true }).first(),
            ).toBeVisible();
        });

        const manager = await createSession(browser, contexts);
        await login(manager.page, accounts.manager);

        await test.step('pengelola menugaskan kader satu', async () => {
            const page = manager.page;
            await page.goto('/operasional/pengumpulan');
            const search = page.getByRole('search');
            await search.locator('input[name="search"]').fill(requestNumber);
            await search
                .locator('select[name="status"]')
                .selectOption('submitted');
            await search
                .getByRole('button', { name: 'Terapkan', exact: true })
                .click();

            const card = page
                .getByRole('article')
                .filter({ hasText: requestNumber });
            await expect(card).toBeVisible();
            await card.getByRole('link', { name: 'Proses' }).click();
            await expect(page).toHaveURL(
                new RegExp(`/pengumpulan/${collectionId}$`),
            );

            const form = page.locator('form[action$="/penugasan"]');
            await expect(form).toBeVisible();
            await form.locator('#assignee_id').selectOption({ label: 'Kader' });
            await form
                .locator('textarea[name="notes"]')
                .fill('Penugasan alur inti Playwright.');
            await form
                .getByRole('button', {
                    name: 'Simpan penugasan',
                    exact: true,
                })
                .click();

            await expect(
                page.getByText('Petugas ditugaskan', { exact: true }).first(),
            ).toBeVisible();
        });

        const officer = await createSession(browser, contexts);
        await login(officer.page, accounts.officer);

        await test.step('kader mengambil dan menimbang seluruh item', async () => {
            const page = officer.page;
            await page.goto(`/pengumpulan/${collectionId}`);

            const pickupForm = page.locator('form[action$="/diambil"]');
            await expect(pickupForm).toBeVisible();
            await pickupForm
                .locator('textarea[name="notes"]')
                .fill('Sampah diterima dari warga.');
            await pickupForm
                .getByRole('button', {
                    name: 'Tandai telah diambil',
                    exact: true,
                })
                .click();
            await expect(
                page.getByText('Sudah diambil', { exact: true }).first(),
            ).toBeVisible();

            const weighForm = page.locator('form[action$="/timbang"]');
            await expect(weighForm).toBeVisible();
            const weightInputs = weighForm.locator('input[name^="weights["]');
            await expect(weightInputs).toHaveCount(1);

            for (let index = 0; index < (await weightInputs.count()); index++) {
                await weightInputs.nth(index).fill('4');
            }

            await weighForm.locator('#proof').setInputFiles({
                name: 'bukti-timbang.png',
                mimeType: 'image/png',
                buffer: proofPng,
            });
            await weighForm
                .locator('textarea[name="notes"]')
                .fill('Seluruh item telah ditimbang.');
            await weighForm
                .getByRole('button', {
                    name: 'Simpan hasil timbang',
                    exact: true,
                })
                .click();

            await expect(
                page.getByText('Sudah ditimbang', { exact: true }).first(),
            ).toBeVisible();
        });

        await test.step('pengelola memverifikasi berat dan menuntaskan permintaan', async () => {
            const page = manager.page;
            await page.goto(`/pengumpulan/${collectionId}`);
            const form = page.locator('form[action$="/verifikasi"]');
            await expect(form).toBeVisible();
            await form
                .getByRole('button', {
                    name: 'Verifikasi pengumpulan',
                    exact: true,
                })
                .click();

            await expect(
                page.getByText('Selesai', { exact: true }).first(),
            ).toBeVisible();
        });

        await test.step('warga melihat poin dan menukar produk', async () => {
            const page = citizen.page;
            await page.goto('/poin');

            const balanceCard = page
                .locator('section')
                .filter({ hasText: 'Saldo tersedia' })
                .first();
            await expect(balanceCard).toContainText('1.100');
            const transaction = page
                .getByRole('article')
                .filter({ hasText: requestNumber });
            await expect(transaction).toContainText('+100 poin');

            await page.goto('/marketplace');
            const product = page
                .getByRole('article')
                .filter({ hasText: 'Kompos EcoPore Demo' });
            await expect(product).toBeVisible();
            await product
                .getByRole('button', {
                    name: 'Tambah ke keranjang',
                    exact: true,
                })
                .click();

            await page.goto('/marketplace/cart');
            await expect(
                page.getByRole('heading', {
                    name: 'Keranjang',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(page.getByText('Kompos EcoPore Demo')).toBeVisible();
            await page
                .getByRole('button', {
                    name: 'Konfirmasi penukaran',
                    exact: true,
                })
                .click();

            await expect(
                page.getByText('Keranjang masih kosong', { exact: true }),
            ).toBeVisible();
            await expect(
                page
                    .locator('aside')
                    .filter({ hasText: 'Ringkasan penukaran' }),
            ).toContainText('850 poin');

            const redemption = page
                .getByRole('article')
                .filter({ hasText: /EVR-/ })
                .first();
            await expect(redemption).toContainText('250 poin');
            await expect(redemption).toContainText('pending');
        });

        await test.step('super admin dapat membuka dashboard pengelolaan', async () => {
            const admin = await createSession(browser, contexts);
            await login(admin.page, accounts.admin);
            await expect(
                admin.page.getByRole('heading', {
                    name: 'Ringkasan operasional',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                admin.page.getByRole('link', {
                    name: 'Buka operasional',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                admin.page.getByText('Pengguna', { exact: true }),
            ).toBeVisible();
            await expect(
                admin.page.getByText('Berat terverifikasi', { exact: true }),
            ).toBeVisible();
        });
    } finally {
        await Promise.allSettled(contexts.map((context) => context.close()));
    }
});

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/*
 * QA aksesibilitas yang dijalankan peramban sungguhan. Pemeriksaan ditulis
 * langsung terhadap DOM dan gaya terkomputasi, tanpa pustaka audit tambahan,
 * agar setiap kegagalan menunjuk elemen yang konkret dan dapat diperbaiki.
 */

const publicPages = [
    '/',
    '/edukasi',
    '/program',
    '/peta',
    '/login',
    '/register',
];

const authenticatedPages = [
    '/dashboard',
    '/admin/master-data',
    '/admin/akses',
    '/operasional/pengumpulan',
];

/** Luminansi relatif menurut WCAG 2.1, dari nilai rgb() apa pun. */
const contrastHelpers = `
    function channel(value) {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    function luminance(color) {
        const [r, g, b] = color
            .replace(/rgba?\\(|\\)|\\s/g, '')
            .split(',')
            .map(Number);
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    function ratio(foreground, background) {
        const a = luminance(foreground);
        const b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }
`;

async function collectViolations(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const problems: string[] = [];
        const describe = (element: Element) => {
            const id = element.id ? `#${element.id}` : '';
            const cls = element.className
                ? `.${String(element.className).split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`
                : '';

            return `${element.tagName.toLowerCase()}${id}${cls}`;
        };
        const isHidden = (element: Element) => {
            const style = getComputedStyle(element);

            return (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                element.closest('[aria-hidden="true"]') !== null
            );
        };
        const accessibleName = (element: Element) => {
            const labelled = element.getAttribute('aria-labelledby');
            const labelledText = labelled
                ? labelled
                      .split(/\s+/)
                      .map(
                          (id) =>
                              document.getElementById(id)?.textContent ?? '',
                      )
                      .join(' ')
                : '';

            return (
                (element.getAttribute('aria-label') ?? '') +
                labelledText +
                (element.textContent ?? '') +
                (element.getAttribute('title') ?? '')
            ).trim();
        };

        // Bahasa dokumen: pembaca layar memilih pelafalan berdasarkan ini.
        if (document.documentElement.lang !== 'id') {
            problems.push(
                `lang dokumen [${document.documentElement.lang}] bukan id`,
            );
        }

        if (document.querySelectorAll('main, [role="main"]').length !== 1) {
            problems.push('halaman harus memiliki tepat satu landmark main');
        }

        const headingOne = document.querySelectorAll('h1');

        if (headingOne.length !== 1) {
            problems.push(
                `halaman memiliki ${headingOne.length} h1, seharusnya tepat satu`,
            );
        }

        // Loncatan level heading membuat navigasi pembaca layar kehilangan urutan.
        let previous = 0;
        document
            .querySelectorAll('h1, h2, h3, h4, h5, h6')
            .forEach((heading) => {
                if (isHidden(heading)) {
                    return;
                }

                const level = Number(heading.tagName.substring(1));

                if (previous !== 0 && level > previous + 1) {
                    problems.push(
                        `heading melompat dari h${previous} ke h${level} pada "${(heading.textContent ?? '').trim().slice(0, 40)}"`,
                    );
                }

                previous = level;
            });

        document.querySelectorAll('img').forEach((image) => {
            if (isHidden(image)) {
                return;
            }

            if (image.getAttribute('alt') === null) {
                problems.push(
                    `img tanpa atribut alt: ${image.getAttribute('src')}`,
                );
            }
        });

        document
            .querySelectorAll('input, select, textarea')
            .forEach((field) => {
                if (
                    isHidden(field) ||
                    field.getAttribute('type') === 'hidden'
                ) {
                    return;
                }

                const labelled =
                    (field.id &&
                        document.querySelector(
                            `label[for="${CSS.escape(field.id)}"]`,
                        )) ||
                    field.closest('label') ||
                    field.getAttribute('aria-label') ||
                    field.getAttribute('aria-labelledby');

                if (!labelled) {
                    problems.push(
                        `kontrol formulir tanpa label: ${describe(field)}`,
                    );
                }
            });

        document.querySelectorAll('button, a[href]').forEach((control) => {
            if (isHidden(control)) {
                return;
            }

            if (
                accessibleName(control) === '' &&
                !control.querySelector('img[alt]:not([alt=""])')
            ) {
                problems.push(
                    `kontrol tanpa nama yang dapat dibacakan: ${describe(control)}`,
                );
            }
        });

        return problems;
    });
}

for (const path of publicPages) {
    test(`aksesibilitas struktural halaman publik ${path}`, async ({
        page,
    }) => {
        await page.goto(path, { waitUntil: 'networkidle' });
        expect(await collectViolations(page)).toEqual([]);
    });
}

test('aksesibilitas struktural halaman terotentikasi', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/login');
    await page.getByLabel('Alamat email').fill('admin@gmail.com');
    await page.getByLabel('Kata sandi', { exact: true }).fill('password');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    // Server pengembangan melayani permintaan satu per satu; ambang bawaan
    // lima detik membuat suite gagal karena beban mesin, bukan karena cacat.
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });

    for (const path of authenticatedPages) {
        await page.goto(path, { waitUntil: 'networkidle' });
        expect(
            await collectViolations(page),
            `pelanggaran pada ${path}`,
        ).toEqual([]);
    }
});

test('navigasi keyboard menembus formulir masuk dan fokusnya terlihat', async ({
    page,
}) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    const reached: string[] = [];

    for (let step = 0; step < 12; step++) {
        await page.keyboard.press('Tab');
        reached.push(
            await page.evaluate(() => {
                const active = document.activeElement;

                if (!active || active === document.body) {
                    return '';
                }

                return `${active.tagName.toLowerCase()}:${active.getAttribute('name') ?? active.getAttribute('href') ?? active.textContent?.trim().slice(0, 20) ?? ''}`;
            }),
        );
    }

    // Ketiga kontrol utama harus dapat dicapai tanpa tetikus.
    expect(reached.some((item) => item.startsWith('input:email'))).toBeTruthy();
    expect(
        reached.some((item) => item.startsWith('input:password')),
    ).toBeTruthy();
    expect(reached.some((item) => item.startsWith('button:'))).toBeTruthy();

    // Fokus harus terlihat: elemen yang difokuskan wajib menampilkan outline
    // atau ring, bukan sekadar berpindah tanpa penanda visual.
    await page.locator('input[name="email"]').focus();
    const focusRing = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement as Element);

        return {
            outlineWidth: style.outlineWidth,
            outlineStyle: style.outlineStyle,
            boxShadow: style.boxShadow,
        };
    });

    const hasVisibleFocus =
        (focusRing.outlineStyle !== 'none' &&
            parseFloat(focusRing.outlineWidth) > 0) ||
        (focusRing.boxShadow !== 'none' && focusRing.boxShadow !== '');

    expect(hasVisibleFocus, JSON.stringify(focusRing)).toBeTruthy();
});

test('kontras teks utama memenuhi ambang WCAG AA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const result = await page.evaluate((helpers) => {
        eval(helpers);
        const problems: string[] = [];

        const backgroundOf = (element: Element): string => {
            let node: Element | null = element;

            while (node) {
                const color = getComputedStyle(node).backgroundColor;

                if (color && !color.startsWith('rgba(0, 0, 0, 0')) {
                    return color;
                }

                node = node.parentElement;
            }

            return 'rgb(0, 0, 0)';
        };

        const candidates = Array.from(
            document.querySelectorAll('p, h1, h2, h3, li, a, button, label'),
        ).filter((element) => {
            const style = getComputedStyle(element);
            const text = (element.textContent ?? '').trim();

            return (
                text.length > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                element.closest('[aria-hidden="true"]') === null &&
                (element as HTMLElement).offsetParent !== null
            );
        });

        for (const element of candidates.slice(0, 120)) {
            const style = getComputedStyle(element);
            const size = parseFloat(style.fontSize);
            const weight = Number(style.fontWeight) || 400;
            // Ambang WCAG AA: 3:1 untuk teks besar, 4.5:1 untuk teks normal.
            const threshold =
                size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;

            // @ts-expect-error helper disuntikkan lewat eval di atas
            const value = ratio(style.color, backgroundOf(element));

            if (value < threshold) {
                problems.push(
                    `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 30)}" rasio ${value.toFixed(2)} < ${threshold}`,
                );
            }
        }

        return { problems, checked: Math.min(candidates.length, 120) };
    }, contrastHelpers);

    // Tanpa ambang ini, test tetap hijau seandainya selektor berhenti cocok
    // dan tidak ada satu pun elemen yang benar-benar diukur.
    expect(result.checked).toBeGreaterThan(30);
    expect(result.problems).toEqual([]);
});

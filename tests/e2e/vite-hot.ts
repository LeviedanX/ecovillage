import { existsSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';

/**
 * `public/hot` adalah penanda bahwa server Vite sedang berjalan. Selama berkas
 * itu ada, Laravel memuat aset dari server dev alih-alih dari hasil build, dan
 * CSP tidak ditegakkan. Suite e2e memeriksa perilaku produksi, jadi penanda
 * disingkirkan selama pengujian lalu dikembalikan persis seperti semula agar
 * sesi `npm run dev` milik pengembang tidak terganggu.
 */
const hotFile = path.resolve('public/hot');
const stashedFile = path.resolve('public/hot.e2e-stashed');

export function stashViteHotFile(): void {
    if (existsSync(stashedFile)) {
        rmSync(stashedFile);
    }

    if (existsSync(hotFile)) {
        renameSync(hotFile, stashedFile);
    }
}

export function restoreViteHotFile(): void {
    if (!existsSync(stashedFile)) {
        return;
    }

    if (existsSync(hotFile)) {
        rmSync(hotFile);
    }

    renameSync(stashedFile, hotFile);
}

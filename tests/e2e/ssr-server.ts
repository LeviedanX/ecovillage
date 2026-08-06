import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Suite e2e menjalankan proses render sisi server yang sama dengan production.
 * Tanpa ini, yang teruji hanyalah jalur render peramban, sedangkan justru HTML
 * awal untuk crawler dan pratinjau tautan yang paling mudah rusak tanpa
 * disadari.
 */
const bundle = path.resolve('bootstrap/ssr/ssr.js');

let server: ChildProcess | null = null;

async function waitUntilHealthy(url: string, attempts = 40): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetch(`${url}/health`);

            if (response.ok) {
                return;
            }
        } catch {
            // Proses belum siap menerima koneksi; coba lagi.
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Server SSR tidak sehat setelah ${attempts} percobaan.`);
}

export async function startSsrServer(url: string): Promise<void> {
    if (!existsSync(bundle)) {
        throw new Error(
            `Bundle SSR tidak ditemukan di ${bundle}. Jalankan \`npm run build:ssr\` sebelum suite e2e.`,
        );
    }

    server = spawn('node', [bundle], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
    });

    await waitUntilHealthy(url);
}

export function stopSsrServer(): void {
    server?.kill();
    server = null;
}

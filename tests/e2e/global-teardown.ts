import { execFileSync } from 'node:child_process';

import { e2eAppEnv } from './env';
import { restoreViteHotFile } from './vite-hot';

export default function globalTeardown() {
    try {
        // Leave the schema in place but empty, so a failed run can still be
        // inspected without the next run inheriting its rows.
        execFileSync(
            'php',
            ['artisan', 'db:wipe', '--force', '--no-interaction'],
            {
                cwd: process.cwd(),
                env: { ...process.env, ...e2eAppEnv },
                stdio: 'inherit',
            },
        );
    } finally {
        // Sesi `npm run dev` pengembang harus kembali seperti sebelum suite
        // berjalan, termasuk ketika pembersihan database gagal.
        restoreViteHotFile();
    }
}

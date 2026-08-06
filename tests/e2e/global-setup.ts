import { execFileSync } from 'node:child_process';

import { e2eAppEnv, e2eDatabase } from './env';
import { stashViteHotFile } from './vite-hot';

const env = { ...process.env, ...e2eAppEnv };

export default function globalSetup() {
    // Suite ini menguji aset hasil build: PWA, chunk produksi, dan CSP yang
    // hanya ditegakkan di luar mode hot. Bila pengembang kebetulan menjalankan
    // `npm run dev`, Laravel akan memuat aset dari server Vite dan hasil test
    // menggambarkan mode yang salah. Berkas penanda disingkirkan sementara.
    stashViteHotFile();

    // The e2e schema is disposable, but it has to exist before Laravel can
    // connect to it, so create it out-of-band on the server connection.
    execFileSync(
        'php',
        [
            '-r',
            '$pdo = new PDO(sprintf("mysql:host=%s;port=%s", $argv[1], $argv[2]), $argv[4], $argv[5]);'
                + ' $pdo->exec(sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", $argv[3]));',
            e2eAppEnv.DB_HOST,
            e2eAppEnv.DB_PORT,
            e2eDatabase,
            e2eAppEnv.DB_USERNAME,
            e2eAppEnv.DB_PASSWORD,
        ],
        { cwd: process.cwd(), env, stdio: 'inherit' },
    );

    execFileSync(
        'php',
        ['artisan', 'migrate:fresh', '--seed', '--force', '--no-interaction'],
        { cwd: process.cwd(), env, stdio: 'inherit' },
    );
}

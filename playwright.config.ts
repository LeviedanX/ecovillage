import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

import { e2eAppEnv } from './tests/e2e/env';

const appEnv = e2eAppEnv;

export default defineConfig({
    testDir: './tests/e2e',
    outputDir: './output/playwright/test-results',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI
        ? [
              ['line'],
              ['html', { outputFolder: 'playwright-report', open: 'never' }],
          ]
        : [['list']],
    globalSetup: './tests/e2e/global-setup.ts',
    globalTeardown: './tests/e2e/global-teardown.ts',
    use: {
        baseURL: appEnv.APP_URL,
        locale: 'id-ID',
        timezoneId: 'Asia/Jakarta',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command:
            'php -S 127.0.0.1:8000 -t . ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
        cwd: path.resolve('public'),
        url: 'http://127.0.0.1:8000/up',
        env: appEnv,
        reuseExistingServer: false,
        timeout: 120_000,
    },
});

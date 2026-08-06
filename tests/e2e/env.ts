/**
 * Environment shared by the Playwright config, global setup and teardown so the
 * web server and the migration/seed step always target the same database.
 */
export const e2eDatabase = process.env.E2E_DB_DATABASE ?? 'ecovillage_id_e2e';

export const e2eAppEnv = {
    APP_ENV: 'testing',
    APP_DEBUG: 'false',
    APP_KEY: 'base64:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    APP_URL: 'http://127.0.0.1:8000',
    CACHE_STORE: 'array',
    DB_CONNECTION: 'mysql',
    DB_HOST: process.env.E2E_DB_HOST ?? '127.0.0.1',
    DB_PORT: process.env.E2E_DB_PORT ?? '3308',
    DB_DATABASE: e2eDatabase,
    DB_USERNAME: process.env.E2E_DB_USERNAME ?? 'root',
    DB_PASSWORD: process.env.E2E_DB_PASSWORD ?? '',
    DB_URL: '',
    DEMO_ACCOUNTS_ENABLED: 'true',
    DEMO_USER_PASSWORD: 'password',
    MAIL_MAILER: 'array',
    QUEUE_CONNECTION: 'sync',
    SESSION_DRIVER: 'file',
};

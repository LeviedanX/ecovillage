/// <reference lib="webworker" />

import type { ManifestEntry } from 'workbox-build';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: ManifestEntry[];
};

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
});

const sensitivePath =
    /^\/(?:dashboard|settings|pengumpulan|poin|dampak|kegiatan|marketplace|forum|admin|operasional|tugas|notifikasi|pencarian|login|register|logout|forgot-password|reset-password|verify-email|confirm-password|two-factor|user)(?:\/|$)/;

registerRoute(
    ({ request, url }) =>
        request.method === 'GET' && sensitivePath.test(url.pathname),
    new NetworkOnly(),
    'GET',
);

// Public education pages are cached only when the server explicitly marks the
// response anonymous and safe. Authenticated Inertia payloads therefore never
// enter this cache accidentally.
registerRoute(
    ({ request, url }) =>
        request.method === 'GET' &&
        request.destination === 'document' &&
        /^\/edukasi(?:\/|$)/.test(url.pathname),
    new StaleWhileRevalidate({
        cacheName: 'public-education-pages-v1',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [200],
                headers: { 'X-EcoVillage-Public': 'true' },
            }),
            new ExpirationPlugin({
                maxEntries: 24,
                maxAgeSeconds: 7 * 24 * 60 * 60,
            }),
        ],
    }),
    'GET',
);

registerRoute(
    ({ request, url }) =>
        request.method === 'GET' &&
        request.destination === 'image' &&
        /^\/(?:media\/public|storage\/education)\//.test(url.pathname),
    new StaleWhileRevalidate({
        cacheName: 'public-education-media-v1',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [200],
                headers: { 'X-EcoVillage-Public': 'true' },
            }),
            new ExpirationPlugin({
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
            }),
        ],
    }),
    'GET',
);

setCatchHandler(async ({ request }) => {
    if (request.destination === 'document') {
        const fallback = await caches.match('/offline.html');

        if (fallback) {
            return fallback;
        }
    }

    return Response.error();
});

import { createInertiaApp } from '@inertiajs/react';
import { resolveLayout, resolvePageTitle, withApp } from '@/inertia-app';

createInertiaApp({
    title: resolvePageTitle,
    layout: resolveLayout,
    strictMode: true,
    withApp,
    progress: {
        color: '#237a4b',
    },
});

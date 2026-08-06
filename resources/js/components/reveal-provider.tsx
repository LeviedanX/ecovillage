import { useEffect } from 'react';
import { initMotion } from '@/lib/motion';
import { initReveal } from '@/lib/reveal';

/**
 * Starts the scroll-reveal engine and the ambient motion effects once, after
 * React has hydrated.
 *
 * The engines write `data-reveal-*` attributes, inline delays and custom
 * properties onto real DOM nodes. Doing that before hydration would make the
 * server markup and the client tree disagree, so React would throw out the SSR
 * output and re-render from scratch. Running them from an effect guarantees
 * hydration has already committed against the pristine markup.
 */
export function RevealProvider() {
    useEffect(() => {
        initReveal();
        initMotion();
    }, []);

    return null;
}

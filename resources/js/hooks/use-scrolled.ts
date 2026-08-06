import { useEffect, useState } from 'react';

export type ScrollDirection = 'up' | 'down';

/** Ignore sub-pixel and rubber-band jitter when deciding on a direction. */
const DIRECTION_THRESHOLD = 6;

/**
 * Tracks which way the visitor is scrolling, so chrome such as the mobile tab
 * bar can move out of the way going down and slide back on the way up.
 */
export function useScrollDirection(): ScrollDirection {
    const [direction, setDirection] = useState<ScrollDirection>('up');

    useEffect(() => {
        let frame = 0;
        let previous = window.scrollY;

        const update = () => {
            frame = 0;

            const current = window.scrollY;
            const delta = current - previous;

            if (Math.abs(delta) < DIRECTION_THRESHOLD) {
                return;
            }

            // Treat the elastic overscroll at the very top as "up".
            setDirection(delta > 0 && current > 0 ? 'down' : 'up');
            previous = current;
        };

        const onScroll = () => {
            if (frame === 0) {
                frame = window.requestAnimationFrame(update);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }

            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    return direction;
}

/**
 * Reports whether the page has scrolled past `offset`, throttled to one read
 * per animation frame. Used to condense sticky headers once the visitor
 * starts moving down the page.
 */
export function useScrolled(offset: number = 12): boolean {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        let frame = 0;

        const update = () => {
            frame = 0;
            setScrolled(window.scrollY > offset);
        };

        const onScroll = () => {
            if (frame === 0) {
                frame = window.requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }

            window.removeEventListener('scroll', onScroll);
        };
    }, [offset]);

    return scrolled;
}

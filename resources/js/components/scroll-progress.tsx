import { useEffect, useRef } from 'react';

/**
 * Thin reading-progress bar pinned under the public header.
 *
 * The scroll handler is passive and writes through a ref inside a rAF, so it
 * never triggers a React render while the visitor scrolls.
 */
export function ScrollProgress() {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bar = barRef.current;

        if (!bar) {
            return;
        }

        let frame = 0;

        const update = () => {
            frame = 0;

            const scrollable =
                document.documentElement.scrollHeight - window.innerHeight;
            const progress =
                scrollable > 0
                    ? Math.min(1, Math.max(0, window.scrollY / scrollable))
                    : 0;

            bar.style.transform = `scaleX(${progress})`;
            bar.style.opacity = progress > 0.005 ? '1' : '0';
        };

        const onScroll = () => {
            if (frame === 0) {
                frame = window.requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        return () => {
            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }

            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
            aria-hidden="true"
        >
            <div
                ref={barRef}
                className="eco-scroll-progress h-full origin-left scale-x-0 bg-linear-to-r from-primary via-emerald-500 to-lime-400 opacity-0 transition-opacity duration-300"
            />
        </div>
    );
}

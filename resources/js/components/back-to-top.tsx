import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Floating "back to top" affordance. It fades and slides out of the way until
 * the visitor is far enough down the page for it to be useful, and sits above
 * the mobile safe area so it never collides with the system gesture bar.
 */
export function BackToTop({ className }: { className?: string }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let frame = 0;

        const update = () => {
            frame = 0;
            setVisible(window.scrollY > 640);
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
    }, []);

    const scrollToTop = () => {
        const reduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    };

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label="Kembali ke atas"
            tabIndex={visible ? 0 : -1}
            className={cn(
                'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 grid size-11 place-items-center rounded-full border bg-background/85 text-foreground shadow-eco-lg backdrop-blur-md transition-all duration-500 ease-out-quint sm:right-6 sm:bottom-6 sm:size-12',
                'hover:-translate-y-1 hover:border-primary/40 hover:text-primary active:translate-y-0 active:scale-95',
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none translate-y-4 opacity-0',
                className,
            )}
        >
            <ArrowUp className="size-5" aria-hidden="true" />
        </button>
    );
}

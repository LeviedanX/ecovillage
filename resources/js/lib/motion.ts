/**
 * Ambient motion: pointer spotlight and scroll parallax.
 *
 * Both effects are driven from a single delegated listener each and write only
 * custom properties or a `translate3d`, so nothing here can trigger layout or
 * a React render while the visitor moves the pointer or scrolls.
 *
 * The spotlight tracks the cursor across `.eco-card-interactive` surfaces,
 * giving cards a light source that follows the hand rather than a fixed
 * gradient painted on at build time. Parallax drifts `data-parallax` elements
 * against the scroll at a fraction of its speed.
 *
 * Both are opt-out under `prefers-reduced-motion`, and the spotlight is
 * additionally gated on a real pointer — on touch there is no hover state to
 * light up, and tracking it would leave a highlight stuck where the last tap
 * landed.
 */

const SPOTLIGHT_SELECTOR = '.eco-card-interactive';
const PARALLAX_SELECTOR = '[data-parallax]';

/** Clamp for authored depths, so a stray value cannot detach an element. */
const MAX_DEPTH = 0.4;

let started = false;

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasFinePointer(): boolean {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Lights the card under the cursor.
 *
 * One document-level listener serves every card on the page; per-card handlers
 * would mean hundreds of listeners on a long index page. The active card's
 * rect is measured once per frame inside the rAF rather than on every move
 * event, so a fast drag costs one layout read per frame at most.
 */
function initSpotlight(): void {
    let active: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;

    const paint = () => {
        frame = 0;

        if (!active) {
            return;
        }

        const rect = active.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            return;
        }

        active.style.setProperty(
            '--pointer-x',
            `${((pointerX - rect.left) / rect.width) * 100}%`,
        );
        active.style.setProperty(
            '--pointer-y',
            `${((pointerY - rect.top) / rect.height) * 100}%`,
        );
    };

    const release = (card: HTMLElement) => {
        /*
         * Reset to the card's own centre-top default rather than removing the
         * properties. Dropping them mid-fade would snap the highlight across
         * the card on the way out.
         */
        card.style.removeProperty('--pointer-x');
        card.style.removeProperty('--pointer-y');
        card.removeAttribute('data-lit');
    };

    document.addEventListener(
        'pointermove',
        (event) => {
            if (event.pointerType !== 'mouse') {
                return;
            }

            const card = (event.target as Element | null)?.closest?.(
                SPOTLIGHT_SELECTOR,
            ) as HTMLElement | null;

            if (card !== active) {
                if (active) {
                    release(active);
                }

                active = card;

                if (active) {
                    active.setAttribute('data-lit', '');
                }
            }

            if (!active) {
                return;
            }

            pointerX = event.clientX;
            pointerY = event.clientY;

            if (frame === 0) {
                frame = window.requestAnimationFrame(paint);
            }
        },
        { passive: true },
    );

    /* A pointer that leaves the window never fires a move over another card. */
    document.addEventListener(
        'pointerleave',
        () => {
            if (active) {
                release(active);
                active = null;
            }
        },
        { passive: true },
    );
}

/**
 * Drifts `data-parallax` elements against the scroll.
 *
 * Only elements currently in view are written to — an IntersectionObserver
 * keeps the per-frame set to what is actually on screen, so a page with
 * decorative layers in every section still only moves a handful of them.
 */
function initParallax(): void {
    const live = new Set<HTMLElement>();
    let frame = 0;

    const paint = () => {
        frame = 0;

        const height =
            window.innerHeight || document.documentElement.clientHeight;

        for (const element of live) {
            const rect = element.getBoundingClientRect();

            /*
             * Progress runs -1 → 1 across the element's full travel through the
             * viewport, 0 at dead centre, so the drift reverses either side of
             * the middle instead of accumulating in one direction.
             */
            const centre = rect.top + rect.height / 2;
            const progress =
                (centre - height / 2) / (height / 2 + rect.height / 2);

            const depth = Math.min(
                Math.abs(Number(element.dataset.parallax) || 0.12),
                MAX_DEPTH,
            );

            element.style.setProperty(
                '--parallax-shift',
                `${(progress * depth * height).toFixed(2)}px`,
            );
        }
    };

    const request = () => {
        if (frame === 0 && live.size > 0) {
            frame = window.requestAnimationFrame(paint);
        }
    };

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const element = entry.target as HTMLElement;

                if (entry.isIntersecting) {
                    live.add(element);
                } else {
                    live.delete(element);
                }
            }

            request();
        },
        { rootMargin: '20% 0px 20% 0px', threshold: 0 },
    );

    const attach = (root: ParentNode) => {
        if (
            root instanceof HTMLElement &&
            root.dataset.parallax !== undefined
        ) {
            observer.observe(root);
        }

        for (const node of Array.from(
            root.querySelectorAll<HTMLElement>(PARALLAX_SELECTOR),
        )) {
            observer.observe(node);
        }
    };

    attach(document.body);

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });

    /* Inertia swaps the page under us; pick up whatever the new one brings. */
    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLElement) {
                    attach(node);
                }
            }

            for (const node of Array.from(mutation.removedNodes)) {
                if (node instanceof HTMLElement && !node.isConnected) {
                    live.delete(node);
                    observer.unobserve(node);

                    for (const child of Array.from(
                        node.querySelectorAll<HTMLElement>(PARALLAX_SELECTOR),
                    )) {
                        live.delete(child);
                        observer.unobserve(child);
                    }
                }
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

    request();
}

export function initMotion(): void {
    if (started || typeof window === 'undefined') {
        return;
    }

    started = true;

    if (prefersReducedMotion()) {
        return;
    }

    document.documentElement.classList.add('motion-on');

    if (hasFinePointer()) {
        initSpotlight();
    }

    initParallax();
}

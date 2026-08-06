/**
 * Scroll-reveal engine.
 *
 * Any element carrying `data-reveal` animates into place when it enters the
 * viewport, and — unlike a fire-once engine — resets itself once it has fully
 * left again, so the entrance replays every time the visitor scrolls back over
 * it. The reset always happens off-screen, behind a viewport-sized buffer, so
 * the visitor never sees an element blink back to its hidden state.
 *
 * Direction is tracked per element rather than assumed. An element that leaves
 * past the top edge is re-armed to enter *downwards*, so scrolling up reads as
 * content settling back down from where it went; one that leaves past the
 * bottom is re-armed to rise. The travel always opposes the scroll, which is
 * what makes the motion feel attached to the page instead of replayed at it.
 *
 * `data-reveal-group` applies the effect to an element's direct children with
 * an incremental delay. Groups carry two stagger tracks: forward order when the
 * grid is approached from below, reversed when it is approached from above, so
 * the item nearest the visitor always moves first in both directions.
 *
 * State machine, per element:
 *
 *   hidden ──enters viewport──▶ visible ──transition ends──▶ settled
 *      ▲                                                        │
 *      └──────────────── leaves viewport ◀──────────────────────┘
 *
 * `settled` holds the finished pose but matches none of the transition rules,
 * which hands the element back its own hover transitions — otherwise a card
 * that inherited a stagger delay would wait that long again before responding
 * to the pointer.
 *
 * Nothing here runs on the server, and the hiding styles are gated behind the
 * `reveal-on` class on <html> — without JS every element stays visible.
 */

type RevealVariant =
    'up' | 'fade' | 'left' | 'right' | 'scale' | 'blur' | 'clip';

const REVEAL_SELECTOR = '[data-reveal],[data-reveal-group]';

/** Cap the stagger so long lists never leave the last item waiting. */
const MAX_STAGGER_INDEX = 6;

/**
 * Upper bound for a reveal, used to settle an element if `transitionend`
 * never arrives — a background tab, or an element hidden mid-transition.
 */
const REVEAL_TIMEOUT_MS = 2000;

/**
 * How far past each viewport edge an element must travel before it is re-armed.
 * Re-arming inside the viewport would show the reset; this keeps it a full
 * half-screen out of sight in both directions.
 */
const REARM_MARGIN = '50% 0px 50% 0px';

/**
 * Entrances are held back until the element is properly inside the viewport
 * rather than clipping its first pixel, so the motion is watched start to
 * finish instead of half-caught at the edge.
 */
const ENTER_MARGIN = '0px 0px -12% 0px';

let started = false;
let enterObserver: IntersectionObserver | null = null;
let exitObserver: IntersectionObserver | null = null;
let mutationObserver: MutationObserver | null = null;

/**
 * Whether the document was held at its starting pose before the first paint.
 *
 * The inline script in the head sets `reveal-armed`, which keeps every reveal
 * target at zero opacity until this engine assigns it a state. When that hold
 * is in place, content already on screen can be given a real entrance — it was
 * never visible, so there is nothing to flash. Without it (an old cached
 * document, or the watchdog having released the page) on-screen elements have
 * to be settled silently, because animating them would mean visibly hiding
 * something the visitor is already reading.
 */
let armed = false;

/** Elements waiting for their on-load entrance to be released. */
let onLoadQueue: HTMLElement[] = [];
let onLoadFrame = 0;

const tracked = new WeakSet<HTMLElement>();

/**
 * Child count each group was last expanded at.
 *
 * Groups are not expanded once and forgotten: several are backed by lists the
 * visitor can add to — extra waste types on a collection request, a new reply
 * in a thread. Remembering the count lets an unchanged group be skipped while
 * a grown one is renumbered, which matters because the reversed stagger track
 * is derived from the total.
 */
const expanded = new WeakMap<HTMLElement, number>();

/** Pending settle timers, so a re-hide can cancel a transition still in flight. */
const timers = new WeakMap<HTMLElement, number>();

function isSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        typeof IntersectionObserver !== 'undefined'
    );
}

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function viewportHeight(): number {
    return window.innerHeight || document.documentElement.clientHeight;
}

/**
 * Writes both stagger tracks onto an element.
 *
 * `--reveal-lead-in` runs while the element is approached from below,
 * `--reveal-lead-back` while it is approached from above; the stylesheet picks
 * between them off `data-reveal-from`.
 */
function setStagger(
    element: HTMLElement,
    forward: string,
    reverse: string,
): void {
    element.style.setProperty('--reveal-lead-in', forward);
    element.style.setProperty('--reveal-lead-back', reverse);
}

/**
 * Expands a `data-reveal-group` container into per-child reveal targets,
 * numbering them so the CSS can stagger the delay from either direction.
 */
function expandGroup(group: HTMLElement): void {
    const children = Array.from(group.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
    );

    if (expanded.get(group) === children.length) {
        return;
    }

    expanded.set(group, children.length);

    const variant = (group.dataset.revealGroup || 'up') as RevealVariant;
    const step = group.dataset.revealStep;
    const distance = group.dataset.revealDistance;
    const unit = step ? `${step}ms` : 'var(--reveal-step)';

    /*
     * The reversed track is capped against the same ceiling as the forward one,
     * so a 30-item list staggers over the same span whichever way it is met.
     */
    const span = Math.min(children.length - 1, MAX_STAGGER_INDEX);

    children.forEach((child, index) => {
        // Respect an explicit per-child variant when the page sets one.
        if (child.dataset.reveal === undefined) {
            child.dataset.reveal = variant;
        }

        if (distance && child.dataset.revealDistance === undefined) {
            child.dataset.revealDistance = distance;
        }

        const forward = Math.min(index, MAX_STAGGER_INDEX);

        setStagger(
            child,
            `calc(${forward} * ${unit})`,
            `calc(${Math.max(span - forward, 0)} * ${unit})`,
        );
    });
}

function register(element: HTMLElement): void {
    if (tracked.has(element)) {
        return;
    }

    tracked.add(element);

    const explicitDelay = element.dataset.revealDelay;

    if (explicitDelay) {
        // An authored delay is deliberate; it applies in both directions.
        setStagger(element, `${explicitDelay}ms`, `${explicitDelay}ms`);
    }

    const rect = element.getBoundingClientRect();
    const height = viewportHeight();
    const onScreen = rect.top < height && rect.bottom > 0;

    if (!onScreen) {
        element.dataset.revealFrom = rect.top >= height ? 'below' : 'above';
        element.dataset.revealState = 'hidden';

        enterObserver?.observe(element);
        exitObserver?.observe(element);

        return;
    }

    /*
     * On-screen content rises into place, matching the direction everything
     * below the fold will travel as the visitor starts scrolling.
     */
    element.dataset.revealFrom = 'below';

    if (!armed) {
        element.dataset.revealState = 'settled';
        enterObserver?.observe(element);
        exitObserver?.observe(element);

        return;
    }

    /*
     * Held at the hidden pose for one frame so the browser has a start state to
     * transition from — flipping straight to `visible` in the same frame would
     * collapse both states into one style recalculation and skip the animation
     * entirely. The whole first screen is released together, which keeps the
     * group stagger intact across the fold.
     */
    element.dataset.revealState = 'hidden';
    onLoadQueue.push(element);

    if (onLoadFrame === 0) {
        onLoadFrame = window.requestAnimationFrame(releaseOnLoad);
    }

    /*
     * Deliberately not handed to the enter observer yet. Its first callback
     * fires almost immediately for an element that is already on screen, and
     * if it won the race against the frame above it would flip the element to
     * `visible` before the hidden pose had been painted — collapsing the
     * entrance into no animation at all. It is observed once released.
     */
    exitObserver?.observe(element);
}

/** Plays the entrance for everything that was already on screen at startup. */
function releaseOnLoad(): void {
    onLoadFrame = 0;

    const queued = onLoadQueue;
    onLoadQueue = [];

    for (const element of queued) {
        if (!element.isConnected) {
            continue;
        }

        if (element.dataset.revealState === 'hidden') {
            markVisible(element);
        }

        enterObserver?.observe(element);
    }
}

function forget(element: HTMLElement): void {
    enterObserver?.unobserve(element);
    exitObserver?.unobserve(element);

    const timer = timers.get(element);

    if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.delete(element);
    }
}

/** Cancels any settle timer still pending for an element. */
function clearTimer(element: HTMLElement): void {
    const timer = timers.get(element);

    if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.delete(element);
    }
}

/**
 * Plays an element's entrance and arranges for it to be settled afterwards.
 *
 * `settled` matters as much as `visible`: it holds the finished pose but drops
 * out of the transition rules, handing the element back its own hover timing.
 */
function markVisible(element: HTMLElement): void {
    element.dataset.revealState = 'visible';

    /*
     * `transitionend` fires once per property, so the listener stays until the
     * opacity leg — the one every variant animates — reports in. `once: true`
     * would consume it on whichever property finished first.
     */
    const finish = () => {
        clearTimer(element);
        element.removeEventListener('transitionend', onEnd);

        // A re-arm may have overtaken the transition; don't undo it.
        if (element.dataset.revealState === 'visible') {
            element.dataset.revealState = 'settled';
        }
    };

    const onEnd = (event: Event) => {
        if (
            event.target === element &&
            (event as TransitionEvent).propertyName === 'opacity'
        ) {
            finish();
        }
    };

    timers.set(element, window.setTimeout(finish, REVEAL_TIMEOUT_MS));
    element.addEventListener('transitionend', onEnd);
}

function handleEnter(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
        const element = entry.target as HTMLElement;

        if (!entry.isIntersecting || element.dataset.revealState !== 'hidden') {
            continue;
        }

        markVisible(element);
    }
}

/**
 * Re-arms an element once it is fully clear of the viewport.
 *
 * The edge it left by becomes the edge it will return from, which is what lets
 * the entrance oppose the scroll direction on the way back.
 */
function handleExit(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            continue;
        }

        const element = entry.target as HTMLElement;

        if (element.dataset.revealState === 'hidden') {
            continue;
        }

        clearTimer(element);

        /*
         * `boundingClientRect` comes off the observer entry rather than a fresh
         * measurement, so re-arming a screenful of elements costs no layout.
         * `rootBounds` is null when the document is in a cross-origin frame,
         * where the live viewport height is the right fallback.
         */
        const edge = entry.rootBounds?.bottom ?? viewportHeight();

        element.dataset.revealFrom =
            entry.boundingClientRect.top >= edge ? 'below' : 'above';
        element.dataset.revealState = 'hidden';
    }
}

function scan(root: ParentNode): void {
    if (root instanceof HTMLElement && root.matches(REVEAL_SELECTOR)) {
        if (root.dataset.revealGroup !== undefined) {
            expandGroup(root);
        }
    }

    for (const node of Array.from(
        root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    )) {
        if (node.dataset.revealGroup !== undefined) {
            expandGroup(node);
        }
    }

    // Groups expand into `data-reveal` children, so query again afterwards.
    if (root instanceof HTMLElement && root.dataset.reveal !== undefined) {
        register(root);
    }

    for (const node of Array.from(
        root.querySelectorAll<HTMLElement>('[data-reveal]'),
    )) {
        register(node);
    }
}

/**
 * Releases every element to its finished pose — used when the visitor turns
 * reduced motion on mid-session.
 */
function releaseAll(): void {
    /*
     * Drop the pre-paint hold first. Anything the engine has not reached yet is
     * only visible because that class is gone, so removing it has to happen
     * before the loop rather than after it.
     */
    document.documentElement.classList.remove('reveal-armed');
    armed = false;

    for (const element of Array.from(
        document.querySelectorAll<HTMLElement>('[data-reveal]'),
    )) {
        forget(element);
        element.dataset.revealState = 'settled';
    }
}

export function initReveal(): void {
    if (started || !isSupported()) {
        return;
    }

    started = true;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    motionQuery.addEventListener('change', () => {
        if (prefersReducedMotion()) {
            releaseAll();
        }
    });

    if (prefersReducedMotion()) {
        /*
         * Styles are already inert under reduced motion, so the observers are
         * skipped — but the pre-paint hold must still be lifted. The inline
         * script does not arm a reduced-motion document, so this only matters
         * when the preference was turned on between paint and hydration.
         */
        document.documentElement.classList.remove('reveal-armed');

        return;
    }

    armed = document.documentElement.classList.contains('reveal-armed');

    document.documentElement.classList.add('reveal-on');

    enterObserver = new IntersectionObserver(handleEnter, {
        rootMargin: ENTER_MARGIN,
        threshold: 0,
    });

    exitObserver = new IntersectionObserver(handleExit, {
        rootMargin: REARM_MARGIN,
        threshold: 0,
    });

    scan(document.body);

    /*
     * React commits can add many nodes in one go. Collecting the roots and
     * scanning them once per frame keeps the DOM queries off the commit path,
     * so typing in a form or re-rendering a list stays cheap.
     */
    let pending: HTMLElement[] = [];
    let scanFrame = 0;

    const flush = () => {
        scanFrame = 0;

        const roots = pending;
        pending = [];

        for (const root of roots) {
            if (root.isConnected) {
                scan(root);
            }
        }
    };

    mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            /*
             * A row appended to an existing group arrives as a child of that
             * group, so scanning only the added node would never reach the
             * container that owns the numbering. Queue the parent too when it
             * is one, and `expandGroup` renumbers the whole list.
             */
            if (
                mutation.target instanceof HTMLElement &&
                mutation.target.dataset.revealGroup !== undefined &&
                mutation.addedNodes.length > 0
            ) {
                pending.push(mutation.target);
            }

            for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLElement) {
                    pending.push(node);
                }
            }

            /*
             * Observers keep a strong reference to their targets, so a page
             * swapped out by Inertia would otherwise stay observed forever.
             * Dropping them here keeps the working set to the live document.
             */
            for (const node of Array.from(mutation.removedNodes)) {
                if (!(node instanceof HTMLElement) || node.isConnected) {
                    continue;
                }

                if (node.dataset.reveal !== undefined) {
                    forget(node);
                }

                for (const child of Array.from(
                    node.querySelectorAll<HTMLElement>('[data-reveal]'),
                )) {
                    forget(child);
                }
            }
        }

        if (pending.length > 0 && scanFrame === 0) {
            scanFrame = window.requestAnimationFrame(flush);
        }
    });

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

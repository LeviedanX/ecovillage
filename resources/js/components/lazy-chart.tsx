import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Suspense boundary for chart bundles.
 *
 * Recharts is ~360 kB of JavaScript. Importing it directly from a page puts it
 * on that page's critical path even though the chart sits below the fold and is
 * useless until data has painted. Loading it through `React.lazy` behind this
 * boundary keeps the first render light and streams the chart in a moment
 * later, with a placeholder that reserves the exact height so nothing shifts.
 */
export function LazyChart({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <Suspense fallback={<ChartSkeleton className={className} />}>
            {children}
        </Suspense>
    );
}

function ChartSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'eco-shimmer w-full rounded-2xl bg-muted/40',
                className,
            )}
            aria-hidden="true"
        />
    );
}

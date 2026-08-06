import type { ReactNode } from 'react';

export function PageIntro({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <div className="min-w-0">
                <h1 className="text-2xl font-bold text-balance sm:text-3xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                        {description}
                    </p>
                )}
            </div>
            {/* Actions stretch on phones so they stay easy to hit. */}
            {action && (
                <div className="flex shrink-0 flex-wrap gap-2 *:min-w-0 *:flex-1 sm:*:flex-none">
                    {action}
                </div>
            )}
        </div>
    );
}

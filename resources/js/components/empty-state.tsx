import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div
            className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-5 py-10 text-center transition-colors duration-500 hover:border-primary/30 hover:bg-muted/45 sm:px-6"
            data-reveal="scale"
            data-reveal-distance="sm"
        >
            <span className="relative grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <span
                    className="absolute inset-0 animate-pulse-ring rounded-2xl bg-primary/20"
                    aria-hidden="true"
                />
                <Icon className="relative size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

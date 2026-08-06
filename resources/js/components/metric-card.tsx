import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MetricCard({
    label,
    value,
    helper,
    icon: Icon,
    tone = 'green',
}: {
    label: string;
    value: string;
    helper?: string;
    icon: LucideIcon;
    tone?: 'green' | 'gold' | 'blue';
}) {
    const toneClass = {
        green: 'bg-emerald-950 text-emerald-200',
        gold: 'bg-amber-950 text-amber-200',
        blue: 'bg-sky-950 text-sky-200',
    }[tone];

    return (
        <div className="eco-card eco-card-interactive group min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-muted-foreground">
                        {label}
                    </p>
                    <p
                        className="mt-2 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl"
                        data-numeric=""
                        title={value}
                    >
                        {value}
                    </p>
                    {helper && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {helper}
                        </p>
                    )}
                </div>
                <span
                    className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:-rotate-6 sm:size-11',
                        toneClass,
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </span>
            </div>
        </div>
    );
}

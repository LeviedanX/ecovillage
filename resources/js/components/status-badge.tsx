import { AlertCircle, CheckCircle2, Clock3, Info, XCircle } from 'lucide-react';
import { collectionStatus } from '@/lib/ecovillage';
import { cn } from '@/lib/utils';
import type { CollectionStatus } from '@/types';

const tones = {
    green: 'border-emerald-800 bg-emerald-950/60 text-emerald-200',
    amber: 'border-amber-800 bg-amber-950/60 text-amber-200',
    blue: 'border-sky-800 bg-sky-950/60 text-sky-200',
    red: 'border-red-800 bg-red-950/60 text-red-200',
    gray: 'border-border bg-muted text-muted-foreground',
};

const icons = {
    green: CheckCircle2,
    amber: Clock3,
    blue: Info,
    red: XCircle,
    gray: AlertCircle,
};

export function StatusBadge({
    status,
    className,
}: {
    status: CollectionStatus;
    className?: string;
}) {
    const meta = collectionStatus[status];
    const Icon = icons[meta.tone];

    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-300',
                tones[meta.tone],
                className,
            )}
        >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{meta.label}</span>
        </span>
    );
}

import { Check, Circle } from 'lucide-react';
import { collectionStatus, formatDate } from '@/lib/ecovillage';
import { cn } from '@/lib/utils';
import type { CollectionStatus, StatusHistory } from '@/types';

const normalFlow: CollectionStatus[] = [
    'submitted',
    'assigned',
    'picked_up',
    'weighed',
    'verified',
    'completed',
];

export function CollectionTimeline({
    currentStatus,
    histories = [],
}: {
    currentStatus: CollectionStatus;
    histories?: StatusHistory[];
}) {
    const terminal = ['rejected', 'cancelled'].includes(currentStatus);
    const steps = terminal
        ? [...normalFlow.slice(0, 1), currentStatus]
        : normalFlow;
    const currentIndex = steps.indexOf(currentStatus);

    return (
        <ol className="space-y-0" aria-label="Perkembangan pengumpulan">
            {steps.map((status, index) => {
                const meta = collectionStatus[status];
                const history = [...histories]
                    .reverse()
                    .find((item) => (item.status ?? item.to_status) === status);
                const historyNote = history?.note ?? history?.notes;
                const actorName = history?.actor_name ?? history?.actor?.name;
                const complete = index <= currentIndex;
                const isCurrent = status === currentStatus;

                return (
                    <li
                        key={status}
                        className="relative flex gap-4 pb-7 last:pb-0"
                    >
                        {index < steps.length - 1 && (
                            <span
                                className={cn(
                                    'absolute top-7 bottom-0 left-[13px] w-0.5 bg-border',
                                    complete &&
                                        index < currentIndex &&
                                        'bg-primary/55',
                                )}
                                aria-hidden="true"
                            />
                        )}
                        <span
                            className={cn(
                                'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 bg-background text-muted-foreground',
                                complete &&
                                    'border-primary bg-primary text-primary-foreground',
                                terminal &&
                                    isCurrent &&
                                    'border-destructive bg-destructive text-white',
                            )}
                            aria-hidden="true"
                        >
                            {complete ? (
                                <Check className="size-4" />
                            ) : (
                                <Circle className="size-3 fill-current" />
                            )}
                        </span>
                        <div className="min-w-0 pt-0.5">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <p
                                    className={cn(
                                        'font-medium',
                                        !complete && 'text-muted-foreground',
                                    )}
                                >
                                    {meta.label}
                                </p>
                                {history && (
                                    <time
                                        className="text-xs text-muted-foreground"
                                        dateTime={history.created_at}
                                    >
                                        {formatDate(history.created_at, true)}
                                    </time>
                                )}
                            </div>
                            <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                {historyNote || meta.description}
                            </p>
                            {actorName && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Oleh {actorName}
                                </p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

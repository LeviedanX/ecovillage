import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicHomeLink({ className }: { className?: string }) {
    return (
        <Link
            href="/"
            className={cn(
                'group flex w-fit items-center gap-2 rounded-full border border-border/80 bg-background/72 px-3.5 py-2 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur-md transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out-quint hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background hover:text-primary hover:shadow-eco active:translate-y-0 active:scale-[0.98]',
                className,
            )}
        >
            <ArrowLeft
                className="size-4 transition-transform duration-300 ease-out-quint group-hover:-translate-x-1"
                aria-hidden="true"
            />
            <span>Kembali ke beranda</span>
        </Link>
    );
}

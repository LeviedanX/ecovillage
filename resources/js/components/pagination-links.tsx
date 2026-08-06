import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaginationLinks({
    currentPage,
    lastPage,
    baseUrl,
}: {
    currentPage: number;
    lastPage: number;
    baseUrl: string;
}) {
    if (lastPage <= 1) {
        return null;
    }

    const href = (page: number) =>
        `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${page}`;

    return (
        <nav
            className="flex items-center justify-between gap-3"
            aria-label="Paginasi"
        >
            <Button
                asChild
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
            >
                <Link href={href(Math.max(1, currentPage - 1))} preserveScroll>
                    <ChevronLeft aria-hidden="true" />
                    Sebelumnya
                </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
                Halaman{' '}
                <strong className="text-foreground">{currentPage}</strong> dari{' '}
                {lastPage}
            </p>
            <Button
                asChild
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage}
            >
                <Link
                    href={href(Math.min(lastPage, currentPage + 1))}
                    preserveScroll
                >
                    Berikutnya
                    <ChevronRight aria-hidden="true" />
                </Link>
            </Button>
        </nav>
    );
}

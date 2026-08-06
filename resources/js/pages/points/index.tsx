import { Head } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Coins,
    History,
    Info,
    RefreshCcw,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { PaginationLinks } from '@/components/pagination-links';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate, formatNumber, formatPoints } from '@/lib/ecovillage';
import { cn } from '@/lib/utils';
import type { Paginated, PointTransaction } from '@/types';

export default function PointsIndex({
    balance = 0,
    transactions = [],
}: {
    balance?: number;
    transactions?: Paginated<PointTransaction> | PointTransaction[];
}) {
    const items = Array.isArray(transactions)
        ? transactions
        : transactions.data;
    const pagination = Array.isArray(transactions) ? null : transactions;

    return (
        <>
            <Head title="Green Points" />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Green Points"
                    description="Saldo berasal dari ledger transaksi. Poin tidak dihitung dari perkiraan berat warga."
                />
                <section
                    className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-amber-300 to-amber-500 p-6 text-amber-950 shadow-[0_24px_60px_-38px_rgba(180,110,0,.8)] sm:p-8"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div
                        className="absolute -top-16 -right-10 size-52 rounded-full border-28 border-white/18"
                        aria-hidden="true"
                    />
                    <div className="relative flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold opacity-75">
                                Saldo tersedia
                            </p>
                            <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                                {formatNumber(balance, 0)}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                Green Points
                            </p>
                        </div>
                        <span className="grid size-12 place-items-center rounded-2xl bg-white/38">
                            <Coins className="size-6" aria-hidden="true" />
                        </span>
                    </div>
                    <p className="relative mt-7 max-w-xl text-sm leading-6 opacity-80">
                        Saldo berkurang hanya melalui transaksi penukaran,
                        kedaluwarsa, reversal, atau penyesuaian yang memiliki
                        alasan.
                    </p>
                </section>
                <Alert>
                    <Info aria-hidden="true" />
                    <AlertTitle>
                        Poin dan estimasi dampak adalah modul terpisah
                    </AlertTitle>
                    <AlertDescription>
                        Perubahan formula baru tidak mengubah transaksi lama.
                        Setiap transaksi menyimpan saldo sebelum dan sesudah.
                    </AlertDescription>
                </Alert>
                <section
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="border-b px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-semibold">
                            Riwayat transaksi
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Catatan debit, kredit, dan koreksi saldo.
                        </p>
                    </div>
                    {items.length > 0 ? (
                        <div
                            className="divide-y"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {items.map((transaction) => (
                                <TransactionRow
                                    key={transaction.id}
                                    transaction={transaction}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-5 sm:p-6">
                            <EmptyState
                                icon={History}
                                title="Belum ada transaksi poin"
                                description="Poin akan tercatat setelah pengumpulan selesai diverifikasi."
                            />
                        </div>
                    )}
                </section>
                {pagination && (
                    <PaginationLinks
                        currentPage={pagination.current_page}
                        lastPage={pagination.last_page}
                        baseUrl="/poin"
                    />
                )}
            </div>
        </>
    );
}

const labels: Record<PointTransaction['type'], string> = {
    earn: 'Poin masuk',
    redeem: 'Penukaran',
    adjustment: 'Penyesuaian',
    reversal: 'Pembalikan',
    expired: 'Kedaluwarsa',
};
function TransactionRow({ transaction }: { transaction: PointTransaction }) {
    const positive = transaction.amount > 0;
    const Icon =
        transaction.type === 'reversal' || transaction.type === 'adjustment'
            ? RefreshCcw
            : positive
              ? ArrowDownLeft
              : ArrowUpRight;

    return (
        <article className="flex gap-4 px-5 py-4 sm:px-6">
            <span
                className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl',
                    positive
                        ? 'bg-emerald-950 text-emerald-200'
                        : 'bg-amber-950 text-amber-200',
                )}
            >
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold">
                            {transaction.description ||
                                labels[transaction.type]}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {labels[transaction.type]} ·{' '}
                            {formatDate(
                                transaction.occurred_at ||
                                    transaction.created_at,
                                true,
                            )}
                        </p>
                    </div>
                    <p
                        className={cn(
                            'font-bold tabular-nums',
                            positive ? 'text-emerald-700' : 'text-foreground',
                        )}
                    >
                        {positive ? '+' : ''}
                        {formatPoints(transaction.amount)}
                    </p>
                </div>
                {transaction.reason && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Alasan: {transaction.reason}
                    </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                    Saldo setelah transaksi:{' '}
                    {formatPoints(transaction.balance_after)}
                </p>
            </div>
        </article>
    );
}

PointsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Green Points', href: '/poin' },
    ],
};

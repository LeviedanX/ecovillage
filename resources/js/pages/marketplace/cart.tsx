import { Form, Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    History,
    PackageOpen,
    ShieldCheck,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatPoints, namedValue } from '@/lib/ecovillage';
import type { CartItem, Product, Redemption } from '@/types';

type Props = {
    cart?: CartItem[];
    products?: Product[];
    totalPoints?: number;
    balance?: number;
    redemptions?: Redemption[];
};

export default function MarketplaceCart({
    cart = [],
    totalPoints = 0,
    balance = 0,
    redemptions = [],
}: Props) {
    const sufficient = balance >= totalPoints;

    return (
        <>
            <Head title="Keranjang Penukaran" />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="-ml-3 w-fit"
                >
                    <Link href="/marketplace">
                        <ArrowLeft aria-hidden="true" />
                        Kembali ke marketplace
                    </Link>
                </Button>
                <PageIntro
                    title="Keranjang"
                    description="Periksa jumlah, stok, dan saldo sebelum mengonfirmasi penukaran."
                />
                <div
                    className="grid gap-6 lg:grid-cols-[1fr_350px]"
                    data-reveal-group="up"
                >
                    <section
                        className="eco-card overflow-hidden"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        <div className="border-b px-5 py-5 sm:px-6">
                            <h2 className="text-lg font-semibold">
                                Produk dipilih
                            </h2>
                        </div>
                        {cart.length > 0 ? (
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="40"
                            >
                                {cart.map((item) => (
                                    <CartRow
                                        key={item.product.id}
                                        item={item}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={PackageOpen}
                                    title="Keranjang masih kosong"
                                    description="Pilih produk yang ingin ditukar dari marketplace."
                                    action={
                                        <Button asChild>
                                            <Link href="/marketplace">
                                                Pilih produk
                                            </Link>
                                        </Button>
                                    }
                                />
                            </div>
                        )}
                    </section>
                    <aside
                        className="eco-card h-fit p-5 sm:p-6"
                        data-reveal="right"
                        data-reveal-distance="sm"
                    >
                        <h2 className="text-lg font-semibold">
                            Ringkasan penukaran
                        </h2>
                        <dl className="mt-5 space-y-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    Saldo tersedia
                                </dt>
                                <dd className="font-semibold">
                                    {formatPoints(balance)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    Total dibutuhkan
                                </dt>
                                <dd className="font-semibold">
                                    {formatPoints(totalPoints)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3 border-t pt-3">
                                <dt className="font-semibold">
                                    Sisa setelah penukaran
                                </dt>
                                <dd className="font-bold">
                                    {sufficient
                                        ? formatPoints(balance - totalPoints)
                                        : 'Tidak cukup'}
                                </dd>
                            </div>
                        </dl>
                        {!sufficient && cart.length > 0 && (
                            <p className="mt-4 flex gap-2 rounded-xl bg-destructive/10 p-3 text-xs leading-5 text-destructive">
                                <AlertTriangle
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                Saldo tidak cukup. Kurangi jumlah atau pilih
                                produk lain.
                            </p>
                        )}
                        <Form
                            action="/marketplace/redeem"
                            method="post"
                            className="mt-5"
                            transform={(data) => ({
                                ...data,
                                idempotency_key: crypto.randomUUID(),
                            })}
                        >
                            {({ processing, errors }) => (
                                <>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={
                                            cart.length === 0 ||
                                            !sufficient ||
                                            processing
                                        }
                                    >
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <CheckCircle2 aria-hidden="true" />
                                        )}
                                        Konfirmasi penukaran
                                    </Button>
                                    {errors.redemption && (
                                        <p className="mt-2 text-xs text-destructive">
                                            {errors.redemption}
                                        </p>
                                    )}
                                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                        Stok dan saldo diperiksa ulang oleh
                                        server saat konfirmasi.
                                    </p>
                                </>
                            )}
                        </Form>
                    </aside>
                </div>
                <Alert>
                    <ShieldCheck aria-hidden="true" />
                    <AlertTitle>Transaksi atomik</AlertTitle>
                    <AlertDescription>
                        Poin dan stok dikurangi dalam satu transaksi. Jika salah
                        satunya gagal, penukaran tidak dibuat.
                    </AlertDescription>
                </Alert>
                <section
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="border-b px-5 py-5 sm:px-6">
                        <h2 className="text-lg font-semibold">
                            Riwayat penukaran terbaru
                        </h2>
                    </div>
                    {redemptions.length > 0 ? (
                        <div
                            className="divide-y"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {redemptions.map((redemption) => (
                                <article
                                    key={redemption.id}
                                    className="flex items-center gap-4 px-5 py-4 sm:px-6"
                                >
                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                        <History
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold">
                                            {redemption.number}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatDate(
                                                redemption.created_at,
                                                true,
                                            )}{' '}
                                            ·{' '}
                                            {formatPoints(
                                                redemption.total_points,
                                            )}
                                        </p>
                                    </div>
                                    <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold">
                                        {redemption.status}
                                    </span>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="p-5 sm:p-6">
                            <EmptyState
                                icon={History}
                                title="Belum ada penukaran"
                                description="Penukaran yang berhasil dibuat akan tampil di sini."
                            />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
function CartRow({ item }: { item: CartItem }) {
    const { product } = item;

    return (
        <article className="flex gap-4 px-5 py-4 sm:px-6">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="size-full object-cover"
                    />
                ) : (
                    <ShoppingCart
                        className="size-7 text-primary/50"
                        aria-hidden="true"
                    />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary">
                    {namedValue(product.category, 'Produk komunitas')}
                </p>
                <h3 className="mt-1 font-semibold">{product.name}</h3>
                <p className="mt-1 text-sm text-amber-300">
                    {formatPoints(product.point_price)} / produk
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Form
                        action={`/marketplace/cart/items/${product.id}`}
                        method="put"
                        className="flex items-center gap-2"
                    >
                        <Input
                            type="number"
                            name="quantity"
                            min="0"
                            max={Math.min(20, product.stock)}
                            defaultValue={item.quantity}
                            aria-label={`Jumlah ${product.name}`}
                            className="h-8 w-20"
                        />
                        <Button type="submit" size="sm" variant="outline">
                            Perbarui
                        </Button>
                    </Form>
                    <Form
                        action={`/marketplace/cart/items/${product.id}`}
                        method="delete"
                    >
                        <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            aria-label={`Hapus ${product.name} dari keranjang`}
                        >
                            <Trash2 aria-hidden="true" />
                            Hapus
                        </Button>
                    </Form>
                </div>
            </div>
            <p className="hidden shrink-0 font-bold sm:block">
                {formatPoints(item.subtotal_points)}
            </p>
        </article>
    );
}
MarketplaceCart.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Marketplace', href: '/marketplace' },
        { title: 'Keranjang', href: '/marketplace/cart' },
    ],
};

import { Form, Head, Link } from '@inertiajs/react';
import {
    Coins,
    PackageOpen,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPoints, namedValue } from '@/lib/ecovillage';
import type { Paginated, Product } from '@/types';

type Props = {
    products?: Paginated<Product> | Product[];
    balance?: number;
    cartCount?: number;
};

export default function MarketplaceIndex({
    products = [],
    balance = 0,
    cartCount = 0,
}: Props) {
    const items = Array.isArray(products) ? products : products.data;
    const pagination = Array.isArray(products) ? null : products;

    return (
        <>
            <Head title="Marketplace" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Marketplace Green Points"
                    description="Pilih produk program, lalu tukarkan poin. Saldo dan stok diperiksa kembali secara atomik saat konfirmasi."
                    action={
                        <Button asChild variant="outline">
                            <Link href="/marketplace/cart">
                                <ShoppingCart aria-hidden="true" />
                                Keranjang
                                {cartCount > 0 && (
                                    <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        </Button>
                    }
                />
                <section
                    className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-amber-300 to-amber-500 p-6 text-amber-950 sm:flex sm:items-center sm:justify-between sm:p-7"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div>
                        <p className="text-sm font-semibold opacity-75">
                            Saldo tersedia
                        </p>
                        <p className="mt-1 text-3xl font-bold tracking-tight">
                            {formatPoints(balance)}
                        </p>
                    </div>
                    <Coins
                        className="absolute -right-4 -bottom-8 size-32 opacity-15 sm:static sm:size-12 sm:opacity-70"
                        aria-hidden="true"
                    />
                </section>
                {items.length > 0 ? (
                    <div
                        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
                        data-reveal-group="up"
                    >
                        {items.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                affordable={balance >= product.point_price}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={PackageOpen}
                        title="Belum ada produk aktif"
                        description="Produk dengan stok tersedia akan tampil di sini."
                    />
                )}
                {pagination && (
                    <PaginationLinks
                        currentPage={pagination.current_page}
                        lastPage={pagination.last_page}
                        baseUrl="/marketplace"
                    />
                )}
                <aside className="rounded-2xl border bg-secondary/45 p-5">
                    <div className="flex gap-3">
                        <Sparkles
                            className="mt-0.5 size-5 shrink-0 text-primary"
                            aria-hidden="true"
                        />
                        <div>
                            <h2 className="font-semibold">
                                Penukaran yang aman
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Menambahkan produk ke keranjang belum mengurangi
                                poin atau stok. Pengurangan terjadi bersamaan
                                ketika penukaran dikonfirmasi server.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}

function ProductCard({
    product,
    affordable,
}: {
    product: Product;
    affordable: boolean;
}) {
    const available = product.is_active !== false && product.stock > 0;

    return (
        <article className="eco-card eco-card-interactive min-w-0 overflow-hidden">
            <div className="relative aspect-square overflow-hidden bg-muted">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="grid size-full place-items-center">
                        <ShoppingBag
                            className="size-11 text-primary/50"
                            aria-hidden="true"
                        />
                    </div>
                )}
                {!available && (
                    <span className="absolute inset-x-3 bottom-3 rounded-lg bg-foreground/85 px-2 py-1 text-center text-xs font-semibold text-background">
                        Stok habis
                    </span>
                )}
            </div>
            <div className="p-4">
                <p className="truncate text-xs font-semibold text-primary">
                    {namedValue(product.category) ||
                        product.program_type ||
                        'Produk komunitas'}
                </p>
                <h2 className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 font-semibold">
                    {product.name}
                </h2>
                <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                        <p className="text-sm font-bold text-amber-300">
                            {formatPoints(product.point_price)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Stok {formatNumber(product.stock, 0)}
                        </p>
                    </div>
                </div>
                <Form
                    action="/marketplace/cart/items"
                    method="post"
                    className="mt-4"
                >
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="quantity" value="1" />
                    <Button
                        type="submit"
                        size="sm"
                        className="w-full"
                        variant={affordable ? 'default' : 'outline'}
                        disabled={!available}
                    >
                        {affordable
                            ? 'Tambah ke keranjang'
                            : 'Poin belum cukup'}
                    </Button>
                </Form>
            </div>
        </article>
    );
}
MarketplaceIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Marketplace', href: '/marketplace' },
    ],
};

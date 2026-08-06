import { Head, Link } from '@inertiajs/react';
import { Coins, PackageOpen, Search, ShoppingBag } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PaginationLinks } from '@/components/pagination-links';
import { PublicHomeLink } from '@/components/public-home-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPoints, namedValue } from '@/lib/ecovillage';
import type { Paginated, Product } from '@/types';

export default function Catalog({
    products = [],
    categories = [],
    filters = {},
}: {
    products?: Paginated<Product> | Product[];
    categories?: string[];
    filters?: { q?: string };
}) {
    const items = Array.isArray(products) ? products : products.data;
    const pagination = Array.isArray(products) ? null : products;

    return (
        <>
            <Head title="Katalog Produk" />
            <section className="relative isolate overflow-hidden">
                <div
                    className="eco-container eco-section relative"
                    data-reveal-group="up"
                    data-reveal-step="80"
                >
                    <PublicHomeLink className="mb-7" />
                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                        Produk dari proses yang memberi nilai kembali.
                    </h1>
                    <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                        Lihat produk EcoPore, EcoCycle, dan program terkelola.
                        Masuk untuk memeriksa saldo dan melakukan penukaran
                        Green Points.
                    </p>
                    <Button asChild className="mt-7">
                        <Link href="/marketplace">
                            <Coins aria-hidden="true" /> Buka marketplace warga
                        </Link>
                    </Button>
                    <form
                        action="/katalog"
                        method="get"
                        role="search"
                        className="mt-7 flex max-w-lg gap-2"
                    >
                        <div className="relative flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                name="q"
                                defaultValue={filters.q}
                                placeholder="Cari produk"
                                className="h-11 bg-background pl-9"
                                aria-label="Cari produk katalog"
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="secondary"
                            className="h-11"
                        >
                            Cari
                        </Button>
                    </form>
                </div>
            </section>
            <div className="eco-surface">
                <section className="eco-container eco-section-sm">
                    {categories.length > 0 && (
                        // Scrolls sideways on phones, wraps once there is room.
                        <nav
                            className="eco-scroll-x mb-8 flex gap-2 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
                            aria-label="Kategori produk"
                            data-reveal-group="right"
                            data-reveal-distance="sm"
                            data-reveal-step="40"
                        >
                            <Link
                                href="/katalog"
                                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-eco transition-transform duration-300 ease-out-quint active:scale-95"
                            >
                                Semua
                            </Link>
                            {categories.map((category) => (
                                <Link
                                    key={category}
                                    href={`/katalog?category=${encodeURIComponent(category)}`}
                                    className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground transition-all duration-300 ease-out-quint hover:-translate-y-0.5 hover:border-primary/35 hover:text-foreground active:scale-95"
                                >
                                    {category}
                                </Link>
                            ))}
                        </nav>
                    )}
                    {items.length > 0 ? (
                        <div
                            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
                            data-reveal-group="up"
                        >
                            {items.map((product) => (
                                <article
                                    key={product.id}
                                    className="eco-card eco-card-interactive min-w-0 overflow-hidden"
                                >
                                    <div className="aspect-square bg-muted">
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
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs font-semibold text-primary">
                                            {namedValue(product.category) ||
                                                product.program_type ||
                                                'Produk komunitas'}
                                        </p>
                                        <h2 className="mt-1 line-clamp-2 font-semibold">
                                            {product.name}
                                        </h2>
                                        <p className="mt-3 text-sm font-bold text-amber-300">
                                            {formatPoints(product.point_price)}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Stok {product.stock}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={PackageOpen}
                            title="Belum ada produk aktif"
                            description="Produk akan tampil setelah pengelola mengaktifkan katalog dan stok tersedia."
                        />
                    )}
                    {pagination && (
                        <div className="mt-10">
                            <PaginationLinks
                                currentPage={pagination.current_page}
                                lastPage={pagination.last_page}
                                baseUrl="/katalog"
                            />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

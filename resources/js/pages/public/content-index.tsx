import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PaginationLinks } from '@/components/pagination-links';
import { PublicHomeLink } from '@/components/public-home-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, namedValue, publicAssetUrl } from '@/lib/ecovillage';
import type { EducationContent, Paginated } from '@/types';

type Props = {
    contents?: Paginated<EducationContent> | EducationContent[];
    categories?: Array<string | { id: number; name: string; slug: string }>;
    filters?: { search?: string; category?: string };
};

export default function ContentIndex({
    contents = [],
    categories = [],
    filters = {},
}: Props) {
    const items = Array.isArray(contents) ? contents : contents.data;
    const pagination = Array.isArray(contents) ? null : contents;

    return (
        <>
            <Head title="Pusat Edukasi">
                <meta
                    name="description"
                    content="Materi pengelolaan sampah organik dan anorganik yang memiliki sumber dan dapat ditelusuri."
                />
            </Head>
            <section className="relative isolate overflow-hidden">
                <div
                    className="eco-container eco-section relative"
                    data-reveal-group="up"
                    data-reveal-step="80"
                >
                    <PublicHomeLink className="mb-7" />
                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                        Belajar mengelola sampah dengan informasi yang
                        bertanggung jawab.
                    </h1>
                    <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                        Cari panduan organik, anorganik, komposisi sampah,
                        infografik, dan materi program yang mencantumkan
                        sumbernya.
                    </p>
                    <form
                        action="/edukasi"
                        method="get"
                        className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
                        role="search"
                    >
                        <div className="relative flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                name="q"
                                defaultValue={filters.search}
                                placeholder="Cari judul atau topik"
                                className="h-11 pl-9"
                                aria-label="Cari materi edukasi"
                            />
                        </div>
                        {filters.category && (
                            <input
                                type="hidden"
                                name="category"
                                value={filters.category}
                            />
                        )}
                        <Button type="submit" className="h-11">
                            Cari materi
                        </Button>
                    </form>
                    {categories.length > 0 && (
                        <nav
                            className="mt-5 flex flex-wrap gap-2"
                            aria-label="Kategori edukasi"
                        >
                            <CategoryLink
                                label="Semua"
                                href="/edukasi"
                                active={!filters.category}
                            />
                            {categories.map((category) => {
                                const label = namedValue(category);
                                const value =
                                    typeof category === 'string'
                                        ? category
                                        : category.slug;

                                return (
                                    <CategoryLink
                                        key={value}
                                        label={label}
                                        href={`/edukasi?category=${encodeURIComponent(value)}`}
                                        active={filters.category === value}
                                    />
                                );
                            })}
                        </nav>
                    )}
                </div>
            </section>
            <div className="eco-surface">
                <section className="eco-container eco-section">
                    {items.length > 0 ? (
                        <div
                            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                            data-reveal-group="up"
                        >
                            {items.map((content) => (
                                <ContentCard
                                    key={content.id}
                                    content={content}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookOpen}
                            title="Materi tidak ditemukan"
                            description="Coba kata kunci atau kategori lain. Materi hanya tampil setelah dipublikasikan pengelola."
                        />
                    )}
                    {pagination && (
                        <div className="mt-10">
                            <PaginationLinks
                                currentPage={pagination.current_page}
                                lastPage={pagination.last_page}
                                baseUrl="/edukasi"
                            />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

function CategoryLink({
    label,
    href,
    active,
}: {
    label: string;
    href: string;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={
                active
                    ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                    : 'rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground'
            }
        >
            {label}
        </Link>
    );
}

function ContentCard({ content }: { content: EducationContent }) {
    const cover = publicAssetUrl(content.cover_url || content.cover_path);

    return (
        <article className="eco-card eco-card-interactive group overflow-hidden">
            <div className="aspect-[16/10] overflow-hidden bg-secondary">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="grid size-full place-items-center">
                        <BookOpen
                            className="size-12 text-primary/55"
                            aria-hidden="true"
                        />
                    </div>
                )}
            </div>
            <div className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                        {namedValue(content.category, 'Edukasi')}
                    </span>
                    <span aria-hidden="true">•</span>
                    <time dateTime={content.published_at || undefined}>
                        {formatDate(content.published_at)}
                    </time>
                </div>
                <h2 className="mt-3 line-clamp-2 text-lg leading-6 font-semibold">
                    <Link
                        href={`/edukasi/${content.slug}`}
                        className="hover:text-primary"
                    >
                        {content.title}
                    </Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {content.excerpt}
                </p>
                <Link
                    href={`/edukasi/${content.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                    Baca materi{' '}
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

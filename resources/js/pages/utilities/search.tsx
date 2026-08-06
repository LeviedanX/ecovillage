import { Form, Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    CalendarHeart,
    ClipboardList,
    MessageSquareText,
    Search,
    ShoppingBag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type SearchResult = {
    title: string;
    description?: string | null;
    href: string;
    meta?: string | null;
};

type SearchResults = {
    collections: SearchResult[];
    education: SearchResult[];
    programs: SearchResult[];
    products: SearchResult[];
    forum: SearchResult[];
};

const groups: Array<{
    key: keyof SearchResults;
    label: string;
    icon: LucideIcon;
}> = [
    { key: 'collections', label: 'Pengumpulan', icon: ClipboardList },
    { key: 'education', label: 'Materi edukasi', icon: BookOpen },
    { key: 'programs', label: 'Program', icon: CalendarHeart },
    { key: 'products', label: 'Produk', icon: ShoppingBag },
    { key: 'forum', label: 'Forum', icon: MessageSquareText },
];

export default function GlobalSearch({
    query = '',
    results,
}: {
    query?: string;
    results: SearchResults;
}) {
    const total = Object.values(results).reduce(
        (sum, items) => sum + items.length,
        0,
    );

    return (
        <>
            <Head title="Pencarian" />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Cari di EcoVillage.id"
                    description="Hasil pengumpulan dan forum otomatis dibatasi sesuai akun, penugasan, serta wilayah Anda."
                />

                <Form
                    action="/pencarian"
                    method="get"
                    className="eco-card flex flex-col gap-3 p-4 sm:flex-row"
                    role="search"
                    options={{ preserveState: true, preserveScroll: true }}
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    {({ processing }) => (
                        <>
                            <label className="sr-only" htmlFor="global-search">
                                Kata kunci pencarian
                            </label>
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="global-search"
                                    name="q"
                                    defaultValue={query}
                                    minLength={2}
                                    maxLength={100}
                                    placeholder="Nomor pengumpulan, edukasi, program, produk, atau forum"
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Cari
                            </Button>
                        </>
                    )}
                </Form>

                {query.length < 2 ? (
                    <EmptyState
                        icon={Search}
                        title="Masukkan sedikitnya dua karakter"
                        description="Pencarian hanya menampilkan data yang memang boleh diakses akun Anda."
                    />
                ) : total === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="Tidak ada hasil"
                        description={`Tidak ditemukan hasil yang dapat Anda akses untuk “${query}”.`}
                    />
                ) : (
                    <div
                        className="grid gap-5 lg:grid-cols-2"
                        data-reveal-group="up"
                    >
                        {groups.map((group) => {
                            const items = results[group.key];

                            if (items.length === 0) {
                                return null;
                            }

                            const Icon = group.icon;

                            return (
                                <section
                                    key={group.key}
                                    className="eco-card p-5"
                                >
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <h2 className="font-semibold">
                                                {group.label}
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                {items.length} hasil teratas
                                            </p>
                                        </div>
                                    </div>
                                    <ul
                                        className="divide-y divide-border/70"
                                        data-reveal-group="up"
                                        data-reveal-distance="xs"
                                        data-reveal-step="40"
                                    >
                                        {items.map((item) => (
                                            <li
                                                key={`${group.key}-${item.href}-${item.title}`}
                                            >
                                                <Link
                                                    href={item.href}
                                                    className="block rounded-lg py-3 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <span className="flex items-start justify-between gap-3">
                                                        <span className="font-medium">
                                                            {item.title}
                                                        </span>
                                                        {item.meta && (
                                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                                {item.meta}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {item.description && (
                                                        <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted-foreground">
                                                            {item.description}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    CalendarHeart,
    MapPin,
    Sprout,
    UsersRound,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PaginationLinks } from '@/components/pagination-links';
import { PublicHomeLink } from '@/components/public-home-link';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber, publicAssetUrl } from '@/lib/ecovillage';
import { cn } from '@/lib/utils';
import type { Paginated, Program } from '@/types';

export default function Programs({
    programs = [],
    type,
}: {
    programs?: Paginated<Program> | Program[];
    type?: string;
}) {
    const items = Array.isArray(programs) ? programs : programs.data;
    const pagination = Array.isArray(programs) ? null : programs;
    const filters = [
        { label: 'Semua', value: '' },
        { label: 'EcoPore', value: 'ecopore' },
        { label: 'EcoCycle', value: 'ecocycle' },
        { label: 'Program lain', value: 'general' },
    ];

    return (
        <>
            <Head title="Program Eco Village" />
            <section className="relative isolate overflow-hidden">
                <div
                    className="eco-container eco-section relative"
                    data-reveal-group="up"
                    data-reveal-step="80"
                >
                    <PublicHomeLink className="mb-7" />
                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                        Program warga untuk lingkungan yang lebih tangguh.
                    </h1>
                    <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                        EcoPore mengembangkan pengolahan organik berbasis
                        biopori. EcoCycle mengolah anorganik menjadi produk
                        bernilai.
                    </p>
                </div>
            </section>
            <div className="eco-surface">
                <section className="eco-container eco-section-sm">
                    {/* Scrolls sideways on phones, wraps once there is room. */}
                    <nav
                        className="eco-scroll-x flex gap-2 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
                        aria-label="Jenis program"
                        data-reveal-group="right"
                        data-reveal-distance="sm"
                        data-reveal-step="40"
                    >
                        {filters.map((filter) => {
                            const active = (type || '') === filter.value;

                            return (
                                <Link
                                    key={filter.value}
                                    href={
                                        filter.value
                                            ? `/program?type=${filter.value}`
                                            : '/program'
                                    }
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-out-quint active:scale-95',
                                        active
                                            ? 'bg-primary text-primary-foreground shadow-eco'
                                            : 'border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:text-foreground',
                                    )}
                                >
                                    {filter.label}
                                </Link>
                            );
                        })}
                    </nav>
                    {items.length > 0 ? (
                        <div
                            className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
                            data-reveal-group="up"
                        >
                            {items.map((program) => (
                                <ProgramCard
                                    key={program.id}
                                    program={program}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-8">
                            <EmptyState
                                icon={CalendarHeart}
                                title="Belum ada program sesuai filter"
                                description="Program hanya tampil setelah jadwal dan pendaftarannya dipublikasikan."
                            />
                        </div>
                    )}
                    {pagination && (
                        <div className="mt-10">
                            <PaginationLinks
                                currentPage={pagination.current_page}
                                lastPage={pagination.last_page}
                                baseUrl={
                                    type ? `/program?type=${type}` : '/program'
                                }
                            />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

function ProgramCard({ program }: { program: Program }) {
    const capacity = program.quota ?? program.capacity;
    const remaining =
        capacity == null || program.registered_count == null
            ? null
            : Math.max(0, capacity - program.registered_count);
    const cover = publicAssetUrl(program.cover_url || program.cover_path);
    const location = program.location || program.location_name;

    return (
        <article className="eco-card eco-card-interactive group overflow-hidden">
            <div className="relative aspect-video overflow-hidden bg-secondary">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="grid size-full place-items-center">
                        <Sprout
                            className="size-14 text-primary/55"
                            aria-hidden="true"
                        />
                    </div>
                )}
                <span className="absolute top-3 left-3 rounded-full bg-background/92 px-3 py-1 text-xs font-semibold text-primary">
                    {program.type === 'ecopore'
                        ? 'EcoPore'
                        : program.type === 'ecocycle'
                          ? 'EcoCycle'
                          : 'Eco Village'}
                </span>
            </div>
            <div className="p-5">
                <h2 className="text-lg leading-6 font-semibold">
                    {program.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {program.description}
                </p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {program.starts_at && (
                        <p className="flex items-center gap-2">
                            <CalendarDays
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />{' '}
                            {formatDate(program.starts_at, true)}
                        </p>
                    )}
                    {location && (
                        <p className="flex items-center gap-2">
                            <MapPin
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />{' '}
                            <span className="truncate">{location}</span>
                        </p>
                    )}
                    {remaining != null && (
                        <p className="flex items-center gap-2">
                            <UsersRound
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />{' '}
                            {formatNumber(remaining, 0)} tempat tersisa
                        </p>
                    )}
                    {remaining == null && capacity != null && (
                        <p className="flex items-center gap-2">
                            <UsersRound
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />
                            Kuota {formatNumber(capacity, 0)} peserta
                        </p>
                    )}
                </div>
                <Button asChild className="mt-5 w-full" variant="outline">
                    <Link href={`/program/${program.slug}`}>
                        Lihat detail <ArrowRight aria-hidden="true" />
                    </Link>
                </Button>
            </div>
        </article>
    );
}

import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    CalendarHeart,
    CheckCircle2,
    MapPin,
    Sprout,
    UsersRound,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/page-intro';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber, publicAssetUrl } from '@/lib/ecovillage';
import type { Paginated, Program } from '@/types';

export default function ProgramIndex({
    programs = [],
}: {
    programs?: Paginated<Program> | Program[];
}) {
    const items = Array.isArray(programs) ? programs : programs.data;
    const pagination = Array.isArray(programs) ? null : programs;

    return (
        <>
            <Head title="Kegiatan Warga" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Kegiatan warga"
                    description="Daftar program, pantau status pendaftaran, dan lihat kembali kegiatan yang pernah diikuti."
                />
                {items.length > 0 ? (
                    <div
                        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                        data-reveal-group="up"
                    >
                        {items.map((program) => (
                            <ProgramCard key={program.id} program={program} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={CalendarHeart}
                        title="Belum ada kegiatan"
                        description="Kegiatan yang dibuka untuk wilayah Anda akan tampil di sini."
                    />
                )}
                {pagination && (
                    <PaginationLinks
                        currentPage={pagination.current_page}
                        lastPage={pagination.last_page}
                        baseUrl="/kegiatan"
                    />
                )}
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
    const registrationStatus =
        program.registration_status || program.registrations?.[0]?.status;

    return (
        <article className="eco-card eco-card-interactive group overflow-hidden">
            <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
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
                          : 'Program'}
                </span>
                {registrationStatus && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        {['registered', 'confirmed'].includes(
                            registrationStatus,
                        )
                            ? 'Terdaftar'
                            : registrationStatus}
                    </span>
                )}
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
                            />
                            {formatDate(program.starts_at, true)}
                        </p>
                    )}
                    {location && (
                        <p className="flex items-center gap-2">
                            <MapPin
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />
                            <span className="truncate">{location}</span>
                        </p>
                    )}
                    {remaining != null && (
                        <p className="flex items-center gap-2">
                            <UsersRound
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />
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
                    <Link href={`/kegiatan/${program.slug}`}>
                        Lihat detail <ArrowRight aria-hidden="true" />
                    </Link>
                </Button>
            </div>
        </article>
    );
}

ProgramIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Kegiatan', href: '/kegiatan' },
    ],
};

import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Clock3,
    LogIn,
    MapPin,
    Sprout,
    UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    formatDate,
    formatNumber,
    namedValue,
    publicAssetUrl,
} from '@/lib/ecovillage';
import type { Program, ProgramSession } from '@/types';

export default function PublicProgramDetail({ program }: { program: Program }) {
    const { auth } = usePage().props;
    const sessions = program.sessions ?? [];
    const capacity = program.quota ?? program.capacity;
    const remaining =
        capacity == null || program.registered_count == null
            ? null
            : Math.max(0, capacity - program.registered_count);
    const registrationOpen =
        program.status === 'registration_open' &&
        (remaining == null || remaining > 0);
    const cover = publicAssetUrl(program.cover_url || program.cover_path);

    return (
        <>
            <Head title={program.title}>
                {program.description && (
                    <meta name="description" content={program.description} />
                )}
            </Head>
            <section className="relative isolate overflow-hidden">
                <div className="eco-container relative py-6 sm:py-8">
                    <Button asChild variant="ghost" size="sm" className="-ml-3">
                        <Link href="/program">
                            <ArrowLeft aria-hidden="true" />
                            Kembali ke program
                        </Link>
                    </Button>
                </div>
            </section>
            <div className="eco-surface">
                <article className="eco-container sm:eco-section-sm py-8">
                    <div className="overflow-hidden rounded-[2rem] border bg-card shadow-sm">
                        <div className="aspect-[16/7] max-h-[470px] bg-secondary">
                            {cover ? (
                                <img
                                    src={cover}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="eco-grid-bg grid size-full place-items-center">
                                    <Sprout
                                        className="size-24 text-primary/45"
                                        aria-hidden="true"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-5 sm:p-8 lg:p-10">
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                                {programType(program.type)}
                            </span>
                            <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                                {program.title}
                            </h1>
                            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                                {program.description ||
                                    'Informasi program akan dilengkapi oleh pengelola.'}
                            </p>
                            <dl
                                className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                                data-reveal-group="scale"
                                data-reveal-distance="sm"
                                data-reveal-step="65"
                            >
                                <Meta
                                    icon={CalendarDays}
                                    label="Jadwal utama"
                                    value={formatDate(program.starts_at, true)}
                                />
                                <Meta
                                    icon={MapPin}
                                    label="Lokasi"
                                    value={
                                        program.location ||
                                        program.location_name ||
                                        'Akan diinformasikan'
                                    }
                                />
                                <Meta
                                    icon={UsersRound}
                                    label="Kuota"
                                    value={capacityLabel(capacity, remaining)}
                                />
                                <Meta
                                    icon={Sprout}
                                    label="Wilayah"
                                    value={
                                        namedValue(program.region) ||
                                        'Terbuka sesuai ketentuan program'
                                    }
                                />
                            </dl>
                        </div>
                    </div>

                    <div
                        className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"
                        data-reveal-group="up"
                    >
                        <section className="eco-card overflow-hidden">
                            <div className="border-b px-5 py-5 sm:px-7">
                                <h2 className="text-xl font-semibold">
                                    Rangkaian sesi
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Jadwal dapat diperbarui oleh pengelola
                                    program.
                                </p>
                            </div>
                            {sessions.length > 0 ? (
                                <ol
                                    className="divide-y"
                                    data-reveal-group="up"
                                    data-reveal-distance="xs"
                                    data-reveal-step="40"
                                >
                                    {sessions.map((session, index) => (
                                        <SessionItem
                                            key={session.id}
                                            session={session}
                                            number={index + 1}
                                        />
                                    ))}
                                </ol>
                            ) : (
                                <p className="px-5 py-8 text-sm text-muted-foreground sm:px-7">
                                    Rincian sesi belum dipublikasikan.
                                </p>
                            )}
                        </section>

                        <aside
                            className="eco-card h-fit p-5 sm:p-6"
                            data-reveal="right"
                            data-reveal-distance="sm"
                        >
                            <h2 className="text-xl font-semibold">
                                {registrationOpen
                                    ? 'Pendaftaran sedang dibuka'
                                    : registrationStatus(program, remaining)}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {registrationOpen
                                    ? 'Masuk ke akun untuk melihat persyaratan, status Anda, dan mengirim pendaftaran.'
                                    : 'Detail ini tetap dapat dibaca. Pendaftaran hanya tersedia pada periode yang ditetapkan pengelola.'}
                            </p>
                            {program.registration_ends_at && (
                                <p className="mt-4 rounded-xl bg-muted/55 p-3 text-xs leading-5 text-muted-foreground">
                                    Batas pendaftaran:{' '}
                                    <strong className="text-foreground">
                                        {formatDate(
                                            program.registration_ends_at,
                                            true,
                                        )}
                                    </strong>
                                </p>
                            )}
                            {auth.user ? (
                                <Button asChild className="mt-5 w-full">
                                    <Link href={`/kegiatan/${program.slug}`}>
                                        Buka di akun saya
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                            ) : (
                                <div className="mt-5 grid gap-2">
                                    <Button asChild>
                                        <Link href="/login">
                                            <LogIn aria-hidden="true" />
                                            Masuk untuk mendaftar
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/register">
                                            Buat akun warga
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </aside>
                    </div>
                </article>
            </div>
        </>
    );
}

function SessionItem({
    session,
    number,
}: {
    session: ProgramSession;
    number: number;
}) {
    return (
        <li className="flex gap-4 px-5 py-5 sm:px-7">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                {number}
            </span>
            <div className="min-w-0">
                <h3 className="font-semibold">{session.title}</h3>
                {session.description && (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {session.description}
                    </p>
                )}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        {formatDate(session.starts_at, true)}
                    </span>
                    {(session.location || session.location_name) && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            {session.location || session.location_name}
                        </span>
                    )}
                </p>
            </div>
        </li>
    );
}

function Meta({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof CalendarDays;
    label: string;
    value: string;
}) {
    return (
        <div className="flex gap-3 rounded-2xl bg-muted/45 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-medium break-words">
                    {value}
                </dd>
            </div>
        </div>
    );
}

function programType(type: Program['type']): string {
    return type === 'ecopore'
        ? 'EcoPore'
        : type === 'ecocycle'
          ? 'EcoCycle'
          : 'Eco Village';
}

function capacityLabel(
    capacity?: number | null,
    remaining?: number | null,
): string {
    if (capacity == null) {
        return 'Tidak dibatasi';
    }

    if (remaining == null) {
        return `${formatNumber(capacity, 0)} peserta`;
    }

    return `${formatNumber(remaining, 0)} tempat tersisa`;
}

function registrationStatus(
    program: Program,
    remaining: number | null,
): string {
    if (program.status === 'completed') {
        return 'Kegiatan telah selesai';
    }

    if (remaining === 0) {
        return 'Kuota telah terpenuhi';
    }

    if (program.status === 'registration_closed') {
        return 'Pendaftaran ditutup';
    }

    return 'Pendaftaran belum dibuka';
}

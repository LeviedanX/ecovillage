import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Sprout,
    UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatNumber, publicAssetUrl } from '@/lib/ecovillage';
import type { Program, ProgramSession } from '@/types';

type Registration = {
    status: string;
    registered_at?: string;
    can_cancel?: boolean;
};

export default function ProgramShow({
    program,
    sessions = [],
    registration = null,
}: {
    program: Program;
    sessions?: ProgramSession[];
    registration?: Registration | null;
}) {
    const capacity = program.quota ?? program.capacity;
    const quotaRemaining =
        capacity == null || program.registered_count == null
            ? null
            : Math.max(0, capacity - program.registered_count);
    const registrationOpen =
        program.status === 'registration_open' ||
        program.status === 'published';
    const cover = publicAssetUrl(program.cover_url || program.cover_path);
    const canCancel =
        registration?.can_cancel ??
        (registration !== null &&
            !['cancelled', 'attended'].includes(registration.status) &&
            (!program.registration_ends_at ||
                new Date(program.registration_ends_at) > new Date()) &&
            (!program.starts_at || new Date(program.starts_at) > new Date()));

    return (
        <>
            <Head title={program.title} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="-ml-3 w-fit"
                >
                    <Link href="/kegiatan">
                        <ArrowLeft aria-hidden="true" />
                        Kembali ke kegiatan
                    </Link>
                </Button>
                <div className="overflow-hidden rounded-[1.75rem] border bg-card">
                    <div className="aspect-16/7 max-h-107.5 bg-secondary">
                        {cover ? (
                            <img
                                src={cover}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            <div className="grid size-full place-items-center">
                                <Sprout
                                    className="size-20 text-primary/50"
                                    aria-hidden="true"
                                />
                            </div>
                        )}
                    </div>
                    <div className="p-5 sm:p-8">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                                {program.type === 'ecopore'
                                    ? 'EcoPore'
                                    : program.type === 'ecocycle'
                                      ? 'EcoCycle'
                                      : 'Eco Village'}
                            </span>
                            {registration && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-200">
                                    <CheckCircle2
                                        className="size-3"
                                        aria-hidden="true"
                                    />
                                    {registration.status === 'registered'
                                        ? 'Anda terdaftar'
                                        : registration.status}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                            {program.title}
                        </h1>
                        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
                            {program.description}
                        </p>
                        <div
                            className="mt-6 grid gap-4 sm:grid-cols-3"
                            data-reveal-group="up"
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
                                value={
                                    quotaRemaining == null
                                        ? capacity == null
                                            ? 'Tanpa batas'
                                            : `${formatNumber(capacity, 0)} peserta`
                                        : `${formatNumber(quotaRemaining, 0)} tempat tersisa`
                                }
                            />
                        </div>
                    </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <div className="space-y-6">
                        <section
                            className="eco-card p-5 sm:p-6"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <h2 className="text-lg font-semibold">
                                Tujuan kegiatan
                            </h2>
                            <p className="mt-3 leading-7 text-muted-foreground">
                                {program.objective ||
                                    program.objectives ||
                                    'Tujuan kegiatan akan dijelaskan oleh pengelola program.'}
                            </p>
                        </section>
                        <section
                            className="eco-card overflow-hidden"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <div className="border-b px-5 py-5 sm:px-6">
                                <h2 className="text-lg font-semibold">
                                    Rangkaian sesi
                                </h2>
                            </div>
                            {sessions.length > 0 ? (
                                <ol
                                    className="divide-y"
                                    data-reveal-group="up"
                                    data-reveal-distance="xs"
                                    data-reveal-step="40"
                                >
                                    {sessions.map((session, index) => (
                                        <li
                                            key={session.id}
                                            className="flex gap-4 px-5 py-4 sm:px-6"
                                        >
                                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="font-semibold">
                                                    {session.title}
                                                </p>
                                                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        {formatDate(
                                                            session.starts_at,
                                                            true,
                                                        )}
                                                    </span>
                                                    {session.location && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                            {session.location}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="p-6 text-sm text-muted-foreground">
                                    Rincian sesi belum dipublikasikan.
                                </p>
                            )}
                        </section>
                    </div>
                    <aside
                        className="eco-card h-fit p-5 sm:p-6"
                        data-reveal="right"
                        data-reveal-distance="sm"
                    >
                        <h2 className="font-semibold">Pendaftaran</h2>
                        {registration ? (
                            <>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Status Anda:{' '}
                                    <strong className="text-foreground">
                                        {registration.status === 'registered'
                                            ? 'Terdaftar'
                                            : registration.status}
                                    </strong>
                                </p>
                                {registration.registered_at && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Terdaftar{' '}
                                        {formatDate(
                                            registration.registered_at,
                                            true,
                                        )}
                                    </p>
                                )}
                                {canCancel && (
                                    <Form
                                        action={`/kegiatan/${program.slug}/batal`}
                                        method="patch"
                                        className="mt-5"
                                    >
                                        {({ processing }) => (
                                            <>
                                                <label
                                                    htmlFor="cancel-reason"
                                                    className="text-xs font-medium"
                                                >
                                                    Alasan pembatalan
                                                </label>
                                                <textarea
                                                    id="cancel-reason"
                                                    name="reason"
                                                    required
                                                    maxLength={500}
                                                    rows={2}
                                                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    className="mt-3 w-full"
                                                    disabled={processing}
                                                >
                                                    {processing && <Spinner />}
                                                    Batalkan pendaftaran
                                                </Button>
                                            </>
                                        )}
                                    </Form>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {registrationOpen
                                        ? 'Daftar untuk mengamankan tempat. Pengelola akan mengonfirmasi status peserta.'
                                        : 'Pendaftaran belum dibuka atau telah ditutup.'}
                                </p>
                                {registrationOpen && (
                                    <Form
                                        action={`/kegiatan/${program.slug}/daftar`}
                                        method="post"
                                        className="mt-5"
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={processing}
                                            >
                                                {processing && <Spinner />}
                                                Daftar kegiatan
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </>
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
        <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}
ProgramShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Kegiatan', href: '/kegiatan' },
        { title: 'Detail', href: '#' },
    ],
};

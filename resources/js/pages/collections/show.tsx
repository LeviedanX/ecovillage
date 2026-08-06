import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    CalendarDays,
    CircleX,
    MapPin,
    Recycle,
    Scale,
    Truck,
    UserCheck,
} from 'lucide-react';
import { CollectionTimeline } from '@/components/collection-timeline';
import InputError from '@/components/input-error';
import { PageIntro } from '@/components/page-intro';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatNumber } from '@/lib/ecovillage';
import type { CollectionRequest } from '@/types';

type AbilitySet = {
    assign?: boolean;
    markPickedUp?: boolean;
    pickedUp?: boolean;
    process?: boolean;
    weigh?: boolean;
    verify?: boolean;
    reject?: boolean;
    cancel?: boolean;
};

type Assignee = { id: number; name: string };

type Props = {
    collection: CollectionRequest;
    abilities?: AbilitySet;
    assignees?: Assignee[];
    mode?: 'operations' | string;
};

export default function CollectionShow({
    collection,
    abilities = {},
    assignees = [],
    mode,
}: Props) {
    const canAssign =
        abilities.assign === true && collection.status === 'submitted';
    const canMarkPickedUp =
        (abilities.markPickedUp ?? abilities.pickedUp ?? abilities.process) ===
            true && collection.status === 'assigned';
    const canWeigh =
        (abilities.weigh ?? abilities.process) === true &&
        collection.status === 'picked_up';
    const canVerify =
        abilities.verify === true && collection.status === 'weighed';
    const canReject =
        (abilities.reject ?? abilities.verify) === true &&
        ['submitted', 'assigned', 'picked_up', 'weighed'].includes(
            collection.status,
        );
    const canCancel =
        abilities.cancel === true &&
        ['submitted', 'assigned'].includes(collection.status);
    const hasOperationalAction =
        canAssign || canMarkPickedUp || canWeigh || canVerify || canReject;
    const operational =
        mode === 'operations' ||
        mode === 'staff' ||
        hasOperationalAction ||
        assignees.length > 0 ||
        abilities.process === true ||
        abilities.verify === true;
    const estimatedWeight =
        collection.total_estimated_weight_kg ??
        collection.items?.reduce(
            (total, item) => total + Number(item.estimated_weight ?? 0),
            0,
        ) ??
        0;
    const verifiedItems =
        collection.items?.filter((item) => item.verified_weight != null) ?? [];
    const verifiedWeight =
        collection.total_verified_weight_kg ??
        (verifiedItems.length > 0
            ? verifiedItems.reduce(
                  (total, item) => total + Number(item.verified_weight ?? 0),
                  0,
              )
            : null);

    return (
        <>
            <Head title={`Pengumpulan ${collection.request_number}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="-ml-3 w-fit"
                >
                    <Link
                        href={
                            operational
                                ? '/operasional/pengumpulan'
                                : '/pengumpulan'
                        }
                    >
                        <ArrowLeft aria-hidden="true" />
                        {operational
                            ? 'Kembali ke operasional'
                            : 'Kembali ke riwayat'}
                    </Link>
                </Button>
                <PageIntro
                    title={collection.request_number}
                    description={`Dibuat ${formatDate(collection.created_at, true)}`}
                    action={<StatusBadge status={collection.status} />}
                />
                <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
                    <div className="space-y-6">
                        <section
                            className="eco-card p-5 sm:p-6"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <h2 className="text-lg font-semibold">Ringkasan</h2>
                            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                                <Detail
                                    icon={Recycle}
                                    label="Metode"
                                    value={
                                        collection.method === 'pickup'
                                            ? 'Dijemput petugas'
                                            : 'Disetorkan warga'
                                    }
                                />
                                <Detail
                                    icon={CalendarDays}
                                    label="Jadwal"
                                    value={formatDate(
                                        collection.desired_at,
                                        true,
                                    )}
                                />
                                <Detail
                                    icon={MapPin}
                                    label="Wilayah / alamat"
                                    value={addressLabel(collection)}
                                />
                                <Detail
                                    icon={Scale}
                                    label="Berat"
                                    value={`${formatNumber(verifiedWeight ?? estimatedWeight)} kg ${verifiedWeight != null ? 'terverifikasi' : 'estimasi'}`}
                                />
                            </dl>
                        </section>
                        <CollectionItems collection={collection} />
                        {collection.notes && (
                            <section
                                className="eco-card p-5 sm:p-6"
                                data-reveal="up"
                                data-reveal-distance="sm"
                            >
                                <h2 className="font-semibold">Catatan warga</h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {collection.notes}
                                </p>
                            </section>
                        )}
                    </div>
                    <aside className="space-y-6">
                        <section
                            className="eco-card p-5 sm:p-6"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <h2 className="text-lg font-semibold">
                                Perkembangan status
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Setiap perubahan status tercatat.
                            </p>
                            <div className="mt-6">
                                <CollectionTimeline
                                    currentStatus={collection.status}
                                    histories={collection.status_histories}
                                />
                            </div>
                        </section>

                        {hasOperationalAction && (
                            <OperationalActions
                                collection={collection}
                                assignees={assignees}
                                actions={{
                                    assign: canAssign,
                                    pickedUp: canMarkPickedUp,
                                    weigh: canWeigh,
                                    verify: canVerify,
                                    reject: canReject,
                                }}
                            />
                        )}

                        {canCancel && (
                            <CancellationForm collectionId={collection.id} />
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

function CollectionItems({ collection }: { collection: CollectionRequest }) {
    return (
        <section
            className="eco-card overflow-hidden"
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <div className="border-b px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold">Rincian sampah</h2>
            </div>
            {collection.items && collection.items.length > 0 ? (
                <div className="divide-y">
                    {collection.items.map((item, index) => (
                        <div
                            key={item.id || index}
                            className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                        >
                            <div>
                                <p className="text-sm font-semibold">
                                    {item.waste_type?.name || 'Jenis sampah'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {typeof item.waste_type?.category ===
                                    'string'
                                        ? item.waste_type.category
                                        : item.waste_type?.category.name}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold">
                                    {formatNumber(
                                        item.verified_weight ??
                                            item.estimated_weight ??
                                            0,
                                    )}{' '}
                                    kg
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.verified_weight != null
                                        ? 'Terverifikasi'
                                        : 'Estimasi'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="p-6 text-sm text-muted-foreground">
                    Rincian item tidak tersedia.
                </p>
            )}
        </section>
    );
}

function OperationalActions({
    collection,
    assignees,
    actions,
}: {
    collection: CollectionRequest;
    assignees: Assignee[];
    actions: {
        assign: boolean;
        pickedUp: boolean;
        weigh: boolean;
        verify: boolean;
        reject: boolean;
    };
}) {
    const baseUrl = `/operasional/pengumpulan/${collection.id}`;

    return (
        <section
            className="eco-card p-5 sm:p-6"
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <h2 className="text-lg font-semibold">Aksi operasional</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Hanya aksi yang sesuai status dan kewenangan Anda yang tersedia.
            </p>

            {actions.assign && (
                <Form action={`${baseUrl}/penugasan`} method="post">
                    {({ processing, errors }) => (
                        <div className="mt-5 space-y-3 border-t pt-5">
                            <ActionTitle
                                icon={UserCheck}
                                title="Tugaskan kader"
                            />
                            <label htmlFor="assignee_id" className="sr-only">
                                Pilih kader
                            </label>
                            <select
                                id="assignee_id"
                                name="assignee_id"
                                required
                                defaultValue=""
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            >
                                <option value="" disabled>
                                    Pilih kader wilayah
                                </option>
                                {assignees.map((assignee) => (
                                    <option
                                        key={assignee.id}
                                        value={assignee.id}
                                    >
                                        {assignee.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.assignee_id} />
                            <textarea
                                name="notes"
                                rows={2}
                                maxLength={500}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                placeholder="Catatan penugasan (opsional)"
                                aria-label="Catatan penugasan"
                            />
                            <InputError message={errors.notes} />
                            <InputError message={errors.status} />
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing || assignees.length === 0}
                            >
                                {processing && <Spinner />}
                                Simpan penugasan
                            </Button>
                            {assignees.length === 0 && (
                                <p className="text-xs text-destructive">
                                    Belum ada kader yang dapat dipilih untuk
                                    wilayah ini.
                                </p>
                            )}
                        </div>
                    )}
                </Form>
            )}

            {actions.pickedUp && (
                <Form action={`${baseUrl}/diambil`} method="patch">
                    {({ processing, errors }) => (
                        <div className="mt-5 space-y-3 border-t pt-5">
                            <ActionTitle
                                icon={Truck}
                                title="Konfirmasi pengambilan"
                            />
                            <textarea
                                name="notes"
                                rows={2}
                                maxLength={500}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                placeholder="Catatan pengambilan (opsional)"
                                aria-label="Catatan pengambilan"
                            />
                            <InputError message={errors.notes} />
                            <InputError message={errors.status} />
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Tandai telah diambil
                            </Button>
                        </div>
                    )}
                </Form>
            )}

            {actions.weigh && (
                <Form action={`${baseUrl}/timbang`} method="patch">
                    {({ processing, errors }) => (
                        <div className="mt-5 space-y-4 border-t pt-5">
                            <ActionTitle
                                icon={Scale}
                                title="Catat hasil timbang"
                            />
                            {collection.items?.map((item, index) => (
                                <div key={item.id ?? index}>
                                    <label
                                        htmlFor={`weight-${item.id}`}
                                        className="mb-1.5 block text-xs font-medium"
                                    >
                                        {item.waste_type?.name ||
                                            `Item ${index + 1}`}{' '}
                                        (kg)
                                    </label>
                                    <Input
                                        id={`weight-${item.id}`}
                                        name={`weights[${item.id}]`}
                                        type="number"
                                        min="0.001"
                                        max="10000"
                                        step="0.001"
                                        inputMode="decimal"
                                        defaultValue={
                                            item.verified_weight ??
                                            item.estimated_weight
                                        }
                                        required
                                    />
                                    <InputError
                                        message={
                                            errors[`weights.${item.id}`] ||
                                            errors.weights
                                        }
                                    />
                                </div>
                            ))}
                            <div>
                                <label
                                    htmlFor="proof"
                                    className="mb-1.5 block text-xs font-medium"
                                >
                                    Bukti foto (opsional)
                                </label>
                                <Input
                                    id="proof"
                                    name="proof"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                />
                                <InputError message={errors.proof} />
                            </div>
                            <textarea
                                name="notes"
                                rows={2}
                                maxLength={500}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                placeholder="Catatan penimbangan (opsional)"
                                aria-label="Catatan penimbangan"
                            />
                            <InputError message={errors.notes} />
                            <InputError message={errors.status} />
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={
                                    processing ||
                                    !collection.items?.every(
                                        (item) => item.id != null,
                                    )
                                }
                            >
                                {processing && <Spinner />}
                                Simpan hasil timbang
                            </Button>
                        </div>
                    )}
                </Form>
            )}

            {actions.verify && (
                <Form action={`${baseUrl}/verifikasi`} method="post">
                    {({ processing, errors }) => (
                        <div className="mt-5 space-y-3 border-t pt-5">
                            <ActionTitle
                                icon={BadgeCheck}
                                title="Verifikasi hasil"
                            />
                            <p className="text-xs leading-5 text-muted-foreground">
                                Verifikasi memfinalkan berat dan mencatat poin
                                serta estimasi dampak melalui transaksi server.
                            </p>
                            <InputError
                                message={errors.verification || errors.weights}
                            />
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Verifikasi pengumpulan
                            </Button>
                        </div>
                    )}
                </Form>
            )}

            {actions.reject && (
                <Form action={`${baseUrl}/tolak`} method="patch">
                    {({ processing, errors }) => (
                        <details className="mt-5 border-t pt-5">
                            <summary className="cursor-pointer text-sm font-semibold text-destructive">
                                Tolak permintaan
                            </summary>
                            <div className="mt-3 space-y-3">
                                <label
                                    htmlFor="reject-reason"
                                    className="text-xs font-medium"
                                >
                                    Alasan penolakan
                                </label>
                                <textarea
                                    id="reject-reason"
                                    name="reason"
                                    rows={3}
                                    minLength={10}
                                    maxLength={1000}
                                    required
                                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                    placeholder="Jelaskan alasan secara spesifik (minimal 10 karakter)"
                                />
                                <InputError message={errors.reason} />
                                <InputError message={errors.status} />
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    className="w-full"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    <CircleX aria-hidden="true" />
                                    Konfirmasi penolakan
                                </Button>
                            </div>
                        </details>
                    )}
                </Form>
            )}
        </section>
    );
}

function CancellationForm({ collectionId }: { collectionId: number }) {
    return (
        <section
            className="eco-card p-5 sm:p-6"
            data-reveal="up"
            data-reveal-distance="sm"
        >
            <h2 className="font-semibold">Batalkan permintaan</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Pembatalan hanya tersedia bagi pemilik permintaan sebelum
                pengambilan dimulai.
            </p>
            <Form action={`/pengumpulan/${collectionId}/batal`} method="patch">
                {({ processing, errors }) => (
                    <div className="mt-4 space-y-2">
                        <label htmlFor="cancel-reason" className="sr-only">
                            Alasan pembatalan
                        </label>
                        <textarea
                            id="cancel-reason"
                            name="reason"
                            rows={3}
                            maxLength={500}
                            required
                            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                            placeholder="Jelaskan alasan pembatalan"
                        />
                        <InputError message={errors.reason} />
                        <InputError message={errors.status} />
                        <Button
                            type="submit"
                            variant="outline"
                            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Batalkan permintaan
                        </Button>
                    </div>
                )}
            </Form>
        </section>
    );
}

function ActionTitle({
    icon: Icon,
    title,
}: {
    icon: typeof UserCheck;
    title: string;
}) {
    return (
        <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            {title}
        </h3>
    );
}

function addressLabel(collection: CollectionRequest): string {
    if (typeof collection.address_snapshot === 'string') {
        return collection.address_snapshot;
    }

    if (collection.address_snapshot) {
        const {
            label,
            address_line: line,
            postal_code: postalCode,
        } = collection.address_snapshot;
        const address = [line, postalCode].filter(Boolean).join(', ');

        return [label, address].filter(Boolean).join(' — ');
    }

    return collection.region_name || 'Tersimpan privat';
}

function Detail({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Recycle;
    label: string;
    value: string;
}) {
    return (
        <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
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

CollectionShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pengumpulan', href: '/pengumpulan' },
        { title: 'Detail', href: '#' },
    ],
};

import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Camera,
    MapPin,
    Plus,
    Recycle,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { LocationPicker } from '@/components/location-picker';
import { PageIntro } from '@/components/page-intro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { UserAddress, WasteType } from '@/types';

type ItemForm = { waste_type_id: string; estimated_weight: string };
type CollectionForm = {
    method: 'pickup' | 'drop_off';
    desired_at: string;
    region_id: string;
    address_id: string;
    latitude: string;
    longitude: string;
    location_consent: boolean;
    notes: string;
    items: ItemForm[];
    photos: File[];
};

type HazardousPolicy =
    | string
    | {
          message?: string;
          contact_name?: string;
          contact_url?: string;
          collection_enabled?: boolean;
      };
type Props = {
    wasteTypes?: WasteType[];
    addresses?: UserAddress[];
    mapStyleUrl?: string;
    hazardousPolicy?: HazardousPolicy;
};

export default function CollectionCreate({
    wasteTypes = [],
    addresses = [],
    mapStyleUrl,
    hazardousPolicy,
}: Props) {
    const primaryAddress =
        addresses.find((address) => address.is_primary) || addresses[0];
    const { data, setData, post, processing, errors } = useForm<CollectionForm>(
        {
            method: 'pickup',
            desired_at: '',
            region_id: primaryAddress?.region_id
                ? String(primaryAddress.region_id)
                : '',
            address_id: primaryAddress ? String(primaryAddress.id) : '',
            latitude: '',
            longitude: '',
            location_consent: false,
            notes: '',
            items: [{ waste_type_id: '', estimated_weight: '' }],
            photos: [],
        },
    );
    const selectedTypes = data.items
        .map((item) =>
            wasteTypes.find((type) => String(type.id) === item.waste_type_id),
        )
        .filter(Boolean) as WasteType[];
    const hasHazardous = selectedTypes.some(isHazardous);
    const selectedAddress = addresses.find(
        (address) => String(address.id) === data.address_id,
    );

    const updateItem = (index: number, key: keyof ItemForm, value: string) =>
        setData(
            'items',
            data.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item,
            ),
        );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/pengumpulan', { forceFormData: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Buat Permintaan Pengumpulan" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="-ml-3 w-fit"
                >
                    <Link href="/pengumpulan">
                        <ArrowLeft aria-hidden="true" /> Kembali
                    </Link>
                </Button>
                <PageIntro
                    title="Buat permintaan pengumpulan"
                    description="Berikan estimasi awal. Poin dan dampak hanya dihitung dari hasil timbang yang telah diverifikasi."
                />
                {/*
                 * The sections already declare their own `fade` variant, so the
                 * group here only contributes the stagger between them.
                 */}
                <form
                    onSubmit={submit}
                    className="space-y-6"
                    noValidate
                    data-reveal-group="fade"
                    data-reveal-step="75"
                >
                    <FormSection
                        number="1"
                        title="Metode dan jadwal"
                        description="Pilih bagaimana sampah diserahkan kepada program."
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    {
                                        value: 'pickup',
                                        label: 'Dijemput petugas',
                                        helper: 'Petugas datang sesuai penugasan.',
                                    },
                                    {
                                        value: 'drop_off',
                                        label: 'Disetorkan',
                                        helper: 'Antar ke titik yang diinformasikan pengelola.',
                                    },
                                ] as const
                            ).map((method) => (
                                <label
                                    key={method.value}
                                    className={
                                        data.method === method.value
                                            ? 'cursor-pointer rounded-2xl border-2 border-primary bg-secondary/50 p-4'
                                            : 'cursor-pointer rounded-2xl border-2 border-border p-4 hover:border-primary/35'
                                    }
                                >
                                    <input
                                        type="radio"
                                        className="sr-only"
                                        name="method"
                                        value={method.value}
                                        checked={data.method === method.value}
                                        onChange={() =>
                                            setData('method', method.value)
                                        }
                                    />
                                    <span className="flex items-center gap-2 font-semibold">
                                        <Recycle
                                            className="size-5 text-primary"
                                            aria-hidden="true"
                                        />
                                        {method.label}
                                    </span>
                                    <span className="mt-1 block text-sm text-muted-foreground">
                                        {method.helper}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <Field
                            label="Jadwal yang diinginkan"
                            htmlFor="desired_at"
                            helper="Jadwal akhir dapat disesuaikan petugas."
                        >
                            <Input
                                id="desired_at"
                                type="datetime-local"
                                value={data.desired_at}
                                onChange={(event) =>
                                    setData('desired_at', event.target.value)
                                }
                                required
                            />
                            <InputError message={errors.desired_at} />
                        </Field>
                    </FormSection>

                    <FormSection
                        number="2"
                        title="Jenis dan estimasi sampah"
                        description="Tambahkan satu atau lebih jenis sampah."
                    >
                        <div
                            className="space-y-3"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="45"
                        >
                            {data.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid gap-3 rounded-2xl border bg-muted/25 p-4 sm:grid-cols-[1fr_180px_auto]"
                                >
                                    <Field
                                        label={`Jenis sampah ${index + 1}`}
                                        htmlFor={`waste-${index}`}
                                    >
                                        <select
                                            id={`waste-${index}`}
                                            value={item.waste_type_id}
                                            onChange={(event) =>
                                                updateItem(
                                                    index,
                                                    'waste_type_id',
                                                    event.target.value,
                                                )
                                            }
                                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                            required
                                        >
                                            <option value="">
                                                Pilih jenis
                                            </option>
                                            {wasteTypes.map((type) => (
                                                <option
                                                    key={type.id}
                                                    value={type.id}
                                                >
                                                    {type.name} —{' '}
                                                    {categoryName(type)}
                                                    {isHazardous(type)
                                                        ? ' (B3)'
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            message={
                                                (
                                                    errors as Record<
                                                        string,
                                                        string
                                                    >
                                                )[
                                                    `items.${index}.waste_type_id`
                                                ]
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Estimasi berat (kg)"
                                        htmlFor={`weight-${index}`}
                                    >
                                        <Input
                                            id={`weight-${index}`}
                                            type="number"
                                            min="0.1"
                                            max="1000"
                                            step="0.1"
                                            inputMode="decimal"
                                            value={item.estimated_weight}
                                            onChange={(event) =>
                                                updateItem(
                                                    index,
                                                    'estimated_weight',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <InputError
                                            message={
                                                (
                                                    errors as Record<
                                                        string,
                                                        string
                                                    >
                                                )[
                                                    `items.${index}.estimated_weight`
                                                ]
                                            }
                                        />
                                    </Field>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="self-end"
                                        disabled={data.items.length === 1}
                                        onClick={() =>
                                            setData(
                                                'items',
                                                data.items.filter(
                                                    (_, itemIndex) =>
                                                        itemIndex !== index,
                                                ),
                                            )
                                        }
                                        aria-label={`Hapus jenis sampah ${index + 1}`}
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setData('items', [
                                    ...data.items,
                                    { waste_type_id: '', estimated_weight: '' },
                                ])
                            }
                        >
                            <Plus aria-hidden="true" /> Tambah jenis
                        </Button>
                        {hasHazardous && (
                            <Alert variant="destructive">
                                <ShieldAlert aria-hidden="true" />
                                <AlertTitle>
                                    Sampah berbahaya memerlukan rujukan khusus
                                </AlertTitle>
                                <AlertDescription>
                                    {typeof hazardousPolicy === 'string'
                                        ? hazardousPolicy
                                        : hazardousPolicy?.message ||
                                          'Permintaan tidak akan diproses sebagai pengambilan umum sebelum mitra atau petugas berwenang dikonfigurasi. Hubungi pengelola dan jangan menangani bahan tersebut sendiri.'}
                                    {typeof hazardousPolicy === 'object' &&
                                    hazardousPolicy.contact_name
                                        ? ` Kontak resmi: ${hazardousPolicy.contact_name}.`
                                        : ''}
                                </AlertDescription>
                            </Alert>
                        )}
                    </FormSection>

                    <FormSection
                        number="3"
                        title="Alamat dan titik lokasi"
                        description="Titik tepat bersifat opsional dan hanya tersedia untuk petugas berwenang pada tugas aktif. Tanpa persetujuan, permintaan tetap memakai alamat tekstual."
                    >
                        <Field
                            label="Alamat tersimpan"
                            htmlFor="address_id"
                            helper="Snapshot alamat dibuat server dari pilihan ini dan tidak dipublikasikan."
                        >
                            <select
                                id="address_id"
                                value={data.address_id}
                                onChange={(event) => {
                                    const address = addresses.find(
                                        (item) =>
                                            String(item.id) ===
                                            event.target.value,
                                    );
                                    setData((current) => ({
                                        ...current,
                                        address_id: event.target.value,
                                        region_id: address?.region_id
                                            ? String(address.region_id)
                                            : '',
                                        latitude: '',
                                        longitude: '',
                                        location_consent: false,
                                    }));
                                }}
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                required
                            >
                                <option value="">Pilih alamat</option>
                                {addresses.map((address) => (
                                    <option key={address.id} value={address.id}>
                                        {address.label} — {address.address_line}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.address_id} />
                            <InputError message={errors.region_id} />
                            {addresses.length === 0 && (
                                <p className="text-xs text-destructive">
                                    Tambahkan alamat melalui Pengaturan sebelum
                                    membuat permintaan.
                                </p>
                            )}
                        </Field>
                        {selectedAddress && (
                            <div className="rounded-xl bg-muted/45 p-3 text-sm">
                                <p className="font-medium">
                                    {selectedAddress.label}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    {selectedAddress.address_line}
                                </p>
                            </div>
                        )}
                        <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
                            <Checkbox
                                id="location_consent"
                                checked={data.location_consent}
                                onCheckedChange={(checked) => {
                                    const consent = checked === true;
                                    setData((current) => ({
                                        ...current,
                                        location_consent: consent,
                                        latitude:
                                            consent &&
                                            selectedAddress?.latitude != null
                                                ? String(
                                                      selectedAddress.latitude,
                                                  )
                                                : '',
                                        longitude:
                                            consent &&
                                            selectedAddress?.longitude != null
                                                ? String(
                                                      selectedAddress.longitude,
                                                  )
                                                : '',
                                    }));
                                }}
                            />
                            <span>
                                <span className="block text-sm font-semibold">
                                    Saya menyetujui penggunaan titik lokasi
                                    untuk pengumpulan ini
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                    Lokasi digunakan untuk operasional tugas
                                    aktif dan tidak muncul di peta publik.
                                </span>
                            </span>
                        </label>
                        <InputError message={errors.location_consent} />
                        {data.location_consent ? (
                            <>
                                <LocationPicker
                                    styleUrl={mapStyleUrl}
                                    value={
                                        data.latitude && data.longitude
                                            ? {
                                                  latitude: Number(
                                                      data.latitude,
                                                  ),
                                                  longitude: Number(
                                                      data.longitude,
                                                  ),
                                              }
                                            : null
                                    }
                                    onChange={(coordinate) => {
                                        setData((current) => ({
                                            ...current,
                                            latitude: String(
                                                coordinate.latitude,
                                            ),
                                            longitude: String(
                                                coordinate.longitude,
                                            ),
                                        }));
                                    }}
                                />
                                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    {data.latitude
                                        ? 'Titik lokasi telah dipilih.'
                                        : 'Pilih satu titik pada peta.'}
                                </p>
                                <InputError
                                    message={
                                        errors.latitude || errors.longitude
                                    }
                                />
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Berikan persetujuan untuk membuka pemilih
                                lokasi.
                            </div>
                        )}
                    </FormSection>

                    <FormSection
                        number="4"
                        title="Foto dan catatan"
                        description="Foto membantu petugas menilai kebutuhan pengambilan."
                    >
                        <Field
                            label="Foto sampah"
                            htmlFor="photos"
                            helper="JPG, PNG, atau WebP. Maksimum mengikuti aturan unggahan server."
                        >
                            <label
                                htmlFor="photos"
                                className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed bg-muted/25 px-6 py-8 text-center hover:border-primary/50"
                            >
                                <Camera
                                    className="size-7 text-primary"
                                    aria-hidden="true"
                                />
                                <span className="mt-2 text-sm font-semibold">
                                    Pilih foto
                                </span>
                                <span className="mt-1 text-xs text-muted-foreground">
                                    {data.photos.length > 0
                                        ? `${data.photos.length} berkas dipilih`
                                        : 'Foto akan diunggah saat formulir dikirim'}
                                </span>
                            </label>
                            <input
                                id="photos"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="sr-only"
                                onChange={(event) =>
                                    setData(
                                        'photos',
                                        Array.from(event.target.files ?? []),
                                    )
                                }
                            />
                            <InputError message={errors.photos} />
                        </Field>
                        <Field
                            label="Catatan untuk petugas (opsional)"
                            htmlFor="notes"
                        >
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(event) =>
                                    setData('notes', event.target.value)
                                }
                                rows={4}
                                maxLength={1000}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                                placeholder="Contoh: akses melalui gang samping"
                            />
                            <InputError message={errors.notes} />
                        </Field>
                    </FormSection>

                    <Alert>
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Periksa sebelum mengirim</AlertTitle>
                        <AlertDescription>
                            Estimasi berat dapat berubah setelah penimbangan.
                            Permintaan tidak akan otomatis dikirim ulang ketika
                            perangkat offline.
                        </AlertDescription>
                    </Alert>
                    <div className="sticky bottom-20 z-20 flex flex-col-reverse gap-3 rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur sm:bottom-4 sm:flex-row sm:justify-end">
                        <Button asChild variant="outline">
                            <Link href="/pengumpulan">Batal</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !data.address_id}
                        >
                            {processing && <Spinner />}Kirim permintaan
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

function FormSection({
    number,
    title,
    description,
    children,
}: {
    number: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    // Fades only — nothing shifts under someone mid-way through the form.
    return (
        <section className="eco-card p-5 sm:p-7" data-reveal="fade">
            <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {number}
                </span>
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            <div className="mt-6 space-y-5">{children}</div>
        </section>
    );
}
function Field({
    label,
    htmlFor,
    helper,
    children,
}: {
    label: string;
    htmlFor: string;
    helper?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {helper && (
                <p className="text-xs leading-5 text-muted-foreground">
                    {helper}
                </p>
            )}
        </div>
    );
}
function categoryName(type: WasteType) {
    return typeof type.category === 'string'
        ? type.category
        : type.category.name;
}
function isHazardous(type: WasteType) {
    return (
        type.is_hazardous ??
        (typeof type.category === 'string'
            ? false
            : Boolean(type.category.is_hazardous))
    );
}

CollectionCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pengumpulan', href: '/pengumpulan' },
        { title: 'Buat permintaan', href: '/pengumpulan/buat' },
    ],
};

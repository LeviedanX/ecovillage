import { Form, Head, Link, useForm, usePage } from '@inertiajs/react';
import { Home, MapPin, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { LocationPicker } from '@/components/location-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { Region, UserAddress } from '@/types';

type Props = {
    addresses?: UserAddress[];
    regions?: Region[];
    editing?: UserAddress | null;
    mapStyleUrl?: string;
};

export default function Addresses({
    addresses = [],
    regions = [],
    editing: editingProp = null,
    mapStyleUrl,
}: Props) {
    const page = usePage();
    const editId = new URL(
        page.url,
        'http://ecovillage.local',
    ).searchParams.get('edit');
    const editing =
        editingProp ||
        addresses.find((address) => String(address.id) === editId) ||
        null;

    return (
        <>
            <Head title="Alamat & Lokasi" />
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Alamat & lokasi
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Kelola alamat untuk pengumpulan. Titik koordinat
                        bersifat opsional dan hanya dipakai setelah persetujuan.
                    </p>
                </div>
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Alamat tersimpan</h2>
                        {editing && (
                            <Button asChild variant="outline" size="sm">
                                <Link href="/settings/addresses">
                                    <Plus aria-hidden="true" />
                                    Alamat baru
                                </Link>
                            </Button>
                        )}
                    </div>
                    {addresses.length > 0 ? (
                        <div className="grid gap-3" data-reveal-group="up">
                            {addresses.map((address) => (
                                <article
                                    key={address.id}
                                    className={
                                        editing?.id === address.id
                                            ? 'rounded-2xl border-2 border-primary bg-secondary/25 p-4'
                                            : 'rounded-2xl border bg-card p-4'
                                    }
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                            <Home
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-semibold">
                                                    {address.label}
                                                </h3>
                                                {address.is_primary && (
                                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                                        Utama
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {address.address_line}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {address.region_name ||
                                                    address.region?.name ||
                                                    'Wilayah belum ditampilkan'}
                                                {address.latitude != null
                                                    ? ' · titik lokasi tersimpan'
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon"
                                            >
                                                <Link
                                                    href={`/settings/addresses?edit=${address.id}`}
                                                    aria-label={`Edit alamat ${address.label}`}
                                                >
                                                    <Pencil aria-hidden="true" />
                                                </Link>
                                            </Button>
                                            <Form
                                                action={`/settings/addresses/${address.id}`}
                                                method="delete"
                                            >
                                                {({ processing }) => (
                                                    <Button
                                                        type="submit"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={
                                                            processing ||
                                                            address.is_primary
                                                        }
                                                        aria-label={`Hapus alamat ${address.label}`}
                                                    >
                                                        <Trash2 aria-hidden="true" />
                                                    </Button>
                                                )}
                                            </Form>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed bg-muted/25 p-6 text-center">
                            <MapPin
                                className="mx-auto size-7 text-primary"
                                aria-hidden="true"
                            />
                            <p className="mt-3 font-semibold">
                                Belum ada alamat
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Tambahkan alamat pertama melalui formulir di
                                bawah.
                            </p>
                        </div>
                    )}
                </section>
                <AddressForm
                    key={editing?.id || 'new'}
                    editing={editing}
                    regions={regions}
                    mapStyleUrl={mapStyleUrl}
                />
            </div>
        </>
    );
}

function AddressForm({
    editing,
    regions,
    mapStyleUrl,
}: {
    editing: UserAddress | null;
    regions: Region[];
    mapStyleUrl?: string;
}) {
    const { data, setData, post, put, processing, errors } = useForm({
        label: editing?.label || '',
        address_line: editing?.address_line || '',
        postal_code: editing?.postal_code || '',
        region_id: editing?.region_id ? String(editing.region_id) : '',
        latitude: editing?.latitude != null ? String(editing.latitude) : '',
        longitude: editing?.longitude != null ? String(editing.longitude) : '',
        location_consent: editing?.location_consent || false,
        is_primary: editing?.is_primary || false,
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (editing) {
            put(`/settings/addresses/${editing.id}`, { preserveScroll: true });
        } else {
            post('/settings/addresses', { preserveScroll: true });
        }
    };
    const toggleConsent = (checked: boolean) =>
        setData((current) => ({
            ...current,
            location_consent: checked,
            ...(!checked ? { latitude: '', longitude: '' } : {}),
        }));

    return (
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
                {editing ? 'Edit alamat' : 'Tambah alamat'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Alamat tidak pernah ditampilkan pada halaman publik.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Label alamat" htmlFor="label">
                        <Input
                            id="label"
                            value={data.label}
                            onChange={(event) =>
                                setData('label', event.target.value)
                            }
                            placeholder="Contoh: Rumah"
                            maxLength={60}
                            required
                        />
                        <InputError message={errors.label} />
                    </Field>
                    <Field label="Wilayah RT/RW" htmlFor="region_id">
                        <select
                            id="region_id"
                            value={data.region_id}
                            onChange={(event) =>
                                setData('region_id', event.target.value)
                            }
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            required
                        >
                            <option value="">Pilih wilayah</option>
                            {regions.map((region) => (
                                <option key={region.id} value={region.id}>
                                    {region.parent_name
                                        ? `${region.parent_name} — `
                                        : ''}
                                    {region.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.region_id} />
                    </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
                    <Field label="Alamat lengkap" htmlFor="address_line">
                        <textarea
                            id="address_line"
                            value={data.address_line}
                            onChange={(event) =>
                                setData('address_line', event.target.value)
                            }
                            rows={3}
                            maxLength={1000}
                            required
                            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                            placeholder="Tuliskan alamat yang cukup jelas untuk petugas"
                        />
                        <InputError message={errors.address_line} />
                    </Field>
                    <Field label="Kode pos" htmlFor="postal_code">
                        <Input
                            id="postal_code"
                            value={data.postal_code}
                            onChange={(event) =>
                                setData(
                                    'postal_code',
                                    event.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 5),
                                )
                            }
                            inputMode="numeric"
                            pattern="[0-9]{5}"
                            maxLength={5}
                            placeholder="65100"
                        />
                        <InputError message={errors.postal_code} />
                    </Field>
                </div>
                <label className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
                    <Checkbox
                        checked={data.location_consent}
                        onCheckedChange={(checked) =>
                            toggleConsent(checked === true)
                        }
                    />
                    <span>
                        <span className="block text-sm font-semibold">
                            Simpan titik lokasi bersama alamat ini
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            Opsional. Titik hanya digunakan untuk operasional
                            pengumpulan yang Anda ajukan.
                        </span>
                    </span>
                </label>
                {data.location_consent && (
                    <>
                        <LocationPicker
                            value={
                                data.latitude && data.longitude
                                    ? {
                                          latitude: Number(data.latitude),
                                          longitude: Number(data.longitude),
                                      }
                                    : null
                            }
                            styleUrl={mapStyleUrl}
                            onChange={(coordinates) =>
                                setData((current) => ({
                                    ...current,
                                    latitude: String(coordinates.latitude),
                                    longitude: String(coordinates.longitude),
                                }))
                            }
                        />
                        <InputError
                            message={errors.latitude || errors.longitude}
                        />
                    </>
                )}
                <label className="flex items-center gap-3">
                    <Checkbox
                        checked={data.is_primary}
                        onCheckedChange={(checked) =>
                            setData('is_primary', checked === true)
                        }
                    />
                    <span className="text-sm font-medium">
                        Jadikan alamat utama
                    </span>
                </label>
                <div className="flex items-start gap-2 rounded-xl bg-secondary/45 p-3 text-xs leading-5 text-muted-foreground">
                    <ShieldCheck
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                    />
                    Koordinat tidak disimpan pada perangkat dan tidak masuk
                    cache PWA.
                </div>
                <div className="flex justify-end gap-3">
                    <Button asChild type="button" variant="outline">
                        <Link href="/settings/addresses">Batal</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {editing ? 'Simpan perubahan' : 'Tambah alamat'}
                    </Button>
                </div>
            </form>
        </section>
    );
}
function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}

Addresses.layout = {
    breadcrumbs: [
        { title: 'Pengaturan', href: '/settings/profile' },
        { title: 'Alamat & lokasi', href: '/settings/addresses' },
    ],
};

import { Form, Head, useForm } from '@inertiajs/react';
import {
    Braces,
    Check,
    Eye,
    Image as ImageIcon,
    LayoutTemplate,
    Palette,
    Plus,
    Save,
    Trash2,
    Type,
    Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageIntro } from '@/components/page-intro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type SettingType = 'text' | 'textarea' | 'image' | 'color' | 'link';

type Setting = {
    key: string;
    label: string;
    group: string;
    type: SettingType;
    help: string | null;
    value: string;
    default: string;
    preview_url: string | null;
};

type BundledAsset = { path: string; url: string; label: string };

type Section = { title: string; body: string; bullets?: string[] };

type Page = {
    id: number;
    slug: string;
    eyebrow: string;
    title: string;
    lead: string;
    icon: string;
    sections: Section[];
    hero_image_path: string;
    hero_image_url: string | null;
    is_active: boolean;
};

type Media = {
    id: number;
    path: string;
    url: string;
    original_name: string;
    alt_text: string | null;
    size_kb: number;
};

type Props = {
    settings: Setting[];
    pages: Page[];
    media: Media[];
    bundled: BundledAsset[];
    icons: string[];
    maxImageKb: number;
};

const groupMeta: Record<
    string,
    { title: string; description: string; icon: LucideIcon }
> = {
    brand: {
        title: 'Identitas situs',
        description:
            'Nama brand dan catatan footer yang tampil di seluruh halaman publik.',
        icon: Type,
    },
    landing: {
        title: 'Halaman depan',
        description:
            'Teks hero, tombol ajakan, ilustrasi, background, dan warna aksen.',
        icon: LayoutTemplate,
    },
    background: {
        title: 'Background situs publik',
        description:
            'Gambar latar yang tampil di seluruh halaman publik. Berkas desktop dan mobile dipilih otomatis oleh browser sesuai lebar layar.',
        icon: ImageIcon,
    },
    pages: {
        title: 'Blok bersama halaman statis',
        description:
            'Ajakan penutup dan catatan privasi yang muncul di delapan halaman informasi.',
        icon: Braces,
    },
    impact: {
        title: 'Dampak',
        description:
            'Disclaimer metodologi yang wajib menyertai angka estimasi.',
        icon: Palette,
    },
};

export default function SiteContent({
    settings,
    pages,
    media,
    bundled,
    icons,
    maxImageKb,
}: Props) {
    const groups = Array.from(
        new Set(settings.map((setting) => setting.group)),
    );

    return (
        <>
            <Head title="Konten situs" />
            <div className="eco-container eco-section-sm space-y-10">
                <PageIntro
                    title="Konten halaman publik"
                    description="Ubah teks, gambar, background, dan warna yang dilihat pengunjung tanpa menyentuh kode. Setiap perubahan tercatat di audit log."
                />

                <AssetsInUse settings={settings} pages={pages} />

                <MediaLibrary media={media} maxImageKb={maxImageKb} />

                {groups.map((group) => (
                    <SettingsGroup
                        key={group}
                        group={group}
                        settings={settings.filter(
                            (setting) => setting.group === group,
                        )}
                        media={media}
                        bundled={bundled}
                    />
                ))}

                <section className="space-y-4">
                    <SectionHeading
                        icon={LayoutTemplate}
                        title="Halaman informasi"
                        description="Delapan halaman statis. Judul, paragraf, daftar poin, ikon, dan gambar header dapat diubah seluruhnya."
                        count={pages.length}
                    />
                    <div className="grid gap-3">
                        {pages.map((page) => (
                            <PageEditor
                                key={page.id}
                                page={page}
                                icons={icons}
                                media={media}
                                bundled={bundled}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    description,
    count,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    count?: number;
}) {
    return (
        <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
                    {title}
                    {count !== undefined && (
                        <Badge variant="secondary">{count}</Badge>
                    )}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

/**
 * Ringkasan seluruh gambar yang sedang dipakai halaman publik. Tanpa panel
 * ini admin harus membuka tiap grup satu per satu untuk tahu aset mana yang
 * aktif dan di mana ia muncul.
 */
function AssetsInUse({
    settings,
    pages,
}: {
    settings: Setting[];
    pages: Page[];
}) {
    const used = [
        ...settings
            .filter((setting) => setting.type === 'image' && setting.value)
            .map((setting) => ({
                key: setting.key,
                label: setting.label,
                path: setting.value,
                url: setting.preview_url ?? '',
            })),
        ...pages
            .filter((page) => page.hero_image_url)
            .map((page) => ({
                key: `page-${page.id}`,
                label: `Header /${page.slug}`,
                path: page.hero_image_path,
                url: page.hero_image_url ?? '',
            })),
    ];

    return (
        <section className="space-y-4">
            <SectionHeading
                icon={Eye}
                title="Aset yang sedang tampil"
                description="Setiap gambar yang saat ini dirender halaman publik, lengkap dengan lokasi pemakaiannya."
                count={used.length}
            />
            {used.length === 0 ? (
                <p className="eco-card p-5 text-sm text-muted-foreground">
                    Belum ada gambar yang dipakai. Halaman publik memakai
                    ilustrasi dan ikon bawaan.
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {used.map((asset) => (
                        <figure
                            key={asset.key}
                            className="eco-card overflow-hidden"
                        >
                            <img
                                src={asset.url}
                                alt=""
                                className="h-28 w-full bg-secondary object-cover"
                            />
                            <figcaption className="space-y-1 p-3">
                                <span className="block text-xs font-semibold">
                                    {asset.label}
                                </span>
                                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                    {asset.path}
                                </span>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
        </section>
    );
}

function SettingsGroup({
    group,
    settings,
    media,
    bundled,
}: {
    group: string;
    settings: Setting[];
    media: Media[];
    bundled: BundledAsset[];
}) {
    const meta = groupMeta[group] ?? {
        title: group,
        description: '',
        icon: Type,
    };

    return (
        <section className="space-y-4">
            <SectionHeading
                icon={meta.icon}
                title={meta.title}
                description={meta.description}
            />
            <Form
                action="/admin/konten-situs/pengaturan"
                method="patch"
                className="eco-card space-y-5 p-5 sm:p-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5 sm:grid-cols-2">
                            {settings.map((setting, index) => (
                                <SettingField
                                    key={setting.key}
                                    setting={setting}
                                    index={index}
                                    media={media}
                                    bundled={bundled}
                                    error={
                                        errors[`settings.${index}.value`] as
                                            string | undefined
                                    }
                                />
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={processing}>
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <Save aria-hidden="true" />
                                )}
                                Simpan {meta.title.toLowerCase()}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </section>
    );
}

function SettingField({
    setting,
    index,
    media,
    bundled,
    error,
}: {
    setting: Setting;
    index: number;
    media: Media[];
    bundled: BundledAsset[];
    error?: string;
}) {
    const inputId = `setting-${setting.key}`;
    // Preview datang dari server agar tetap benar untuk aset bawaan maupun
    // unggahan, tanpa perlu menebak URL di sisi klien.
    const preview = setting.preview_url;

    return (
        <div className={setting.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <input
                type="hidden"
                name={`settings[${index}][key]`}
                value={setting.key}
            />
            <label
                htmlFor={inputId}
                className="mb-1.5 block text-sm font-medium"
            >
                {setting.label}
            </label>

            {setting.type === 'textarea' && (
                <textarea
                    id={inputId}
                    name={`settings[${index}][value]`}
                    defaultValue={setting.value}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
            )}

            {setting.type === 'image' && (
                <div className="space-y-2">
                    <select
                        id={inputId}
                        name={`settings[${index}][value]`}
                        defaultValue={setting.value}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <option value="">Tidak memakai gambar</option>
                        {bundled.map((asset) => (
                            <option key={asset.path} value={asset.path}>
                                {asset.label}
                            </option>
                        ))}
                        {media.map((asset) => (
                            <option key={asset.id} value={asset.path}>
                                {asset.original_name}
                            </option>
                        ))}
                    </select>
                    {preview ? (
                        <figure className="space-y-1">
                            <img
                                src={preview}
                                alt=""
                                className="h-28 w-full rounded-lg border bg-secondary object-cover"
                            />
                            <figcaption className="truncate font-mono text-[11px] text-muted-foreground">
                                {setting.value}
                            </figcaption>
                        </figure>
                    ) : (
                        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                            Belum ada gambar dipilih.
                        </p>
                    )}
                </div>
            )}

            {setting.type === 'color' && (
                <div className="flex gap-2">
                    <input
                        type="color"
                        aria-label={`${setting.label} pemilih warna`}
                        defaultValue={setting.value || '#10b981'}
                        onChange={(event) => {
                            const sibling = document.getElementById(
                                inputId,
                            ) as HTMLInputElement | null;

                            if (sibling) {
                                sibling.value = event.target.value;
                            }
                        }}
                        className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                    />
                    <Input
                        id={inputId}
                        name={`settings[${index}][value]`}
                        defaultValue={setting.value}
                        placeholder="#10b981"
                    />
                </div>
            )}

            {(setting.type === 'text' || setting.type === 'link') && (
                <Input
                    id={inputId}
                    name={`settings[${index}][value]`}
                    defaultValue={setting.value}
                    placeholder={setting.default}
                />
            )}

            {setting.help && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                    {setting.help}
                </p>
            )}
            <InputError message={error} />
        </div>
    );
}

function MediaLibrary({
    media,
    maxImageKb,
}: {
    media: Media[];
    maxImageKb: number;
}) {
    return (
        <section className="space-y-4">
            <SectionHeading
                icon={ImageIcon}
                title="Pustaka gambar"
                description={`Unggah gambar untuk hero, background, dan header halaman. Maksimal ${Math.round(maxImageKb / 1024)} MB, format JPEG/PNG/WebP/AVIF.`}
                count={media.length}
            />

            <Form
                action="/admin/konten-situs/media"
                method="post"
                resetOnSuccess
                className="eco-card flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="flex-1">
                            <label
                                htmlFor="media-file"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Berkas gambar
                            </label>
                            <Input
                                id="media-file"
                                name="file"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                required
                            />
                            <InputError message={errors.file} />
                        </div>
                        <div className="flex-1">
                            <label
                                htmlFor="media-alt"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Teks alternatif
                            </label>
                            <Input
                                id="media-alt"
                                name="alt_text"
                                placeholder="Deskripsi singkat gambar"
                            />
                            <InputError message={errors.alt_text} />
                        </div>
                        <Button type="submit" disabled={processing}>
                            {processing ? (
                                <Spinner />
                            ) : (
                                <Upload aria-hidden="true" />
                            )}
                            Unggah
                        </Button>
                    </>
                )}
            </Form>

            {media.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {media.map((asset) => (
                        <figure
                            key={asset.id}
                            className="eco-card overflow-hidden"
                        >
                            <img
                                src={asset.url}
                                alt={asset.alt_text ?? ''}
                                className="h-28 w-full object-cover"
                            />
                            <figcaption className="flex items-center justify-between gap-2 p-3">
                                <span className="min-w-0">
                                    <span className="block truncate text-xs font-medium">
                                        {asset.original_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {asset.size_kb} KB
                                    </span>
                                </span>
                                <Form
                                    action={`/admin/konten-situs/media/${asset.id}`}
                                    method="delete"
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon"
                                            disabled={processing}
                                            aria-label={`Hapus ${asset.original_name}`}
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </Button>
                                    )}
                                </Form>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
        </section>
    );
}

function PageEditor({
    page,
    icons,
    media,
    bundled,
}: {
    page: Page;
    icons: string[];
    media: Media[];
    bundled: BundledAsset[];
}) {
    const [open, setOpen] = useState(false);
    const { data, setData, patch, processing, errors, reset } = useForm({
        eyebrow: page.eyebrow,
        title: page.title,
        lead: page.lead,
        icon: page.icon,
        is_active: page.is_active,
        hero_image_path: page.hero_image_path,
        sections: page.sections.map((section) => ({
            title: section.title,
            body: section.body,
            bullets: section.bullets ?? [],
        })),
    });

    const updateSection = (index: number, patchValue: Partial<Section>) => {
        setData(
            'sections',
            data.sections.map((section, current) =>
                current === index ? { ...section, ...patchValue } : section,
            ),
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset();
                }
            }}
        >
            <div className="eco-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                        /{page.slug}
                        {!page.is_active && (
                            <Badge variant="outline">Nonaktif</Badge>
                        )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {page.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {page.sections.length} bagian
                    </p>
                </div>
                <DialogTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                        <Save aria-hidden="true" />
                        Edit halaman
                    </Button>
                </DialogTrigger>
            </div>

            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit /{page.slug}</DialogTitle>
                    <DialogDescription>
                        Seluruh teks yang tampil pada halaman ini. Perubahan
                        langsung berlaku setelah disimpan.
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        patch(`/admin/konten-situs/halaman/${page.id}`, {
                            preserveScroll: true,
                            onSuccess: () => setOpen(false),
                        });
                    }}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor={`eyebrow-${page.id}`}
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Nama singkat halaman
                            </label>
                            <p className="mb-1.5 text-xs text-muted-foreground">
                                Dipakai sebagai judul tab browser, tidak
                                dirender di badan halaman.
                            </p>
                            <Input
                                id={`eyebrow-${page.id}`}
                                value={data.eyebrow}
                                onChange={(event) =>
                                    setData('eyebrow', event.target.value)
                                }
                            />
                            <InputError message={errors.eyebrow} />
                        </div>
                        <div>
                            <label
                                htmlFor={`icon-${page.id}`}
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Ikon header
                            </label>
                            <select
                                id={`icon-${page.id}`}
                                value={data.icon}
                                onChange={(event) =>
                                    setData('icon', event.target.value)
                                }
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                                {icons.map((icon) => (
                                    <option key={icon} value={icon}>
                                        {icon}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.icon} />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor={`title-${page.id}`}
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Judul utama
                        </label>
                        <textarea
                            id={`title-${page.id}`}
                            value={data.title}
                            onChange={(event) =>
                                setData('title', event.target.value)
                            }
                            rows={2}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div>
                        <label
                            htmlFor={`lead-${page.id}`}
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Paragraf pembuka
                        </label>
                        <textarea
                            id={`lead-${page.id}`}
                            value={data.lead}
                            onChange={(event) =>
                                setData('lead', event.target.value)
                            }
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        />
                        <InputError message={errors.lead} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor={`hero-${page.id}`}
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Gambar header
                            </label>
                            <select
                                id={`hero-${page.id}`}
                                value={data.hero_image_path}
                                onChange={(event) =>
                                    setData(
                                        'hero_image_path',
                                        event.target.value,
                                    )
                                }
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                                <option value="">Pakai ikon bawaan</option>
                                {bundled.map((asset) => (
                                    <option key={asset.path} value={asset.path}>
                                        {asset.label}
                                    </option>
                                ))}
                                {media.map((asset) => (
                                    <option key={asset.id} value={asset.path}>
                                        {asset.original_name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.hero_image_path} />
                            {page.hero_image_url && (
                                <img
                                    src={page.hero_image_url}
                                    alt=""
                                    className="mt-2 h-24 w-full rounded-lg border bg-secondary object-cover"
                                />
                            )}
                        </div>
                        <label className="flex items-center gap-3 self-end rounded-xl border p-3 text-sm">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(event) =>
                                    setData('is_active', event.target.checked)
                                }
                                className="size-4"
                            />
                            Halaman aktif dan dapat diakses publik
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                                Bagian isi ({data.sections.length})
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setData('sections', [
                                        ...data.sections,
                                        { title: '', body: '', bullets: [] },
                                    ])
                                }
                            >
                                <Plus aria-hidden="true" />
                                Tambah bagian
                            </Button>
                        </div>

                        {data.sections.map((section, index) => (
                            <fieldset
                                key={index}
                                className="space-y-3 rounded-xl border p-4"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <legend className="text-xs font-semibold text-muted-foreground">
                                        Bagian {index + 1}
                                    </legend>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Hapus bagian ${index + 1}`}
                                        disabled={data.sections.length <= 1}
                                        onClick={() =>
                                            setData(
                                                'sections',
                                                data.sections.filter(
                                                    (_, current) =>
                                                        current !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </div>
                                <Input
                                    value={section.title}
                                    aria-label={`Judul bagian ${index + 1}`}
                                    placeholder="Judul bagian"
                                    onChange={(event) =>
                                        updateSection(index, {
                                            title: event.target.value,
                                        })
                                    }
                                />
                                <InputError
                                    message={
                                        errors[
                                            `sections.${index}.title` as keyof typeof errors
                                        ] as string | undefined
                                    }
                                />
                                <textarea
                                    value={section.body}
                                    aria-label={`Isi bagian ${index + 1}`}
                                    placeholder="Isi paragraf"
                                    rows={3}
                                    onChange={(event) =>
                                        updateSection(index, {
                                            body: event.target.value,
                                        })
                                    }
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                />
                                <InputError
                                    message={
                                        errors[
                                            `sections.${index}.body` as keyof typeof errors
                                        ] as string | undefined
                                    }
                                />
                                <textarea
                                    value={(section.bullets ?? []).join('\n')}
                                    aria-label={`Poin bagian ${index + 1}`}
                                    placeholder="Satu poin per baris (opsional)"
                                    rows={3}
                                    onChange={(event) =>
                                        updateSection(index, {
                                            bullets: event.target.value
                                                .split('\n')
                                                .map((line) => line.trim())
                                                .filter(
                                                    (line) => line.length > 0,
                                                ),
                                        })
                                    }
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                />
                            </fieldset>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? (
                                <Spinner />
                            ) : (
                                <Check aria-hidden="true" />
                            )}
                            Simpan halaman
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

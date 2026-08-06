import { Form, Head, Link } from '@inertiajs/react';
import {
    BookOpenCheck,
    Boxes,
    CalendarDays,
    ChevronRight,
    ClipboardCheck,
    Coins,
    FileClock,
    Leaf,
    MapPinned,
    PackageCheck,
    Pencil,
    Plus,
    ReceiptText,
    Save,
    ScrollText,
    ShieldCheck,
    Trash2,
    UsersRound,
    Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AlertError from '@/components/alert-error';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageIntro } from '@/components/page-intro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatNumber, formatPoints } from '@/lib/ecovillage';

type AbilityKey =
    | 'regionsManage'
    | 'wasteManage'
    | 'factorsManage'
    | 'educationManage'
    | 'programsManage'
    | 'productsManage'
    | 'redemptionsProcess'
    | 'auditView';

type Abilities = Partial<Record<AbilityKey, boolean>>;

type Region = {
    id: number;
    parent_id?: number | null;
    level: string;
    code: string;
    name: string;
    is_active: boolean;
};

type WasteCategory = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    is_hazardous: boolean;
    is_active: boolean;
    sort_order?: number | null;
    waste_types?: WasteType[];
};

type WasteType = {
    id: number;
    waste_category_id: number;
    name: string;
    slug: string;
    unit: string;
    description?: string | null;
    handling_notes?: string | null;
    is_active: boolean;
};

type PointRule = {
    id: number;
    waste_type_id: number;
    version: number;
    points_per_kg: number | string;
    effective_from: string;
    effective_to?: string | null;
    is_active: boolean;
    waste_type?: Pick<WasteType, 'id' | 'name' | 'unit'> | null;
};

type EnvironmentalFactor = {
    id: number;
    environmental_factor_set_id?: number;
    waste_type_id: number;
    impact_kind: string;
    factor_value: number | string;
    unit: string;
    notes?: string | null;
    waste_type?: Pick<WasteType, 'id' | 'name'> | null;
};

type FactorSet = {
    id: number;
    region_id?: number | null;
    name: string;
    version: number;
    source_name: string;
    source_url?: string | null;
    effective_from?: string | null;
    effective_to?: string | null;
    methodology_notes?: string | null;
    scope_notes?: string | null;
    status: string;
    is_demo: boolean;
    region?: Pick<Region, 'id' | 'name'> | null;
    factors?: EnvironmentalFactor[];
};

type NamedCategory = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
};

type EducationContent = {
    id: number;
    education_category_id?: number;
    region_id?: number | null;
    title: string;
    slug: string;
    excerpt?: string | null;
    body?: string | null;
    external_url?: string | null;
    status: string;
    published_at?: string | null;
    category?: NamedCategory | null;
    region?: Pick<Region, 'id' | 'name'> | null;
    author?: { id: number; name: string } | null;
};

type StaffUser = {
    id: number;
    name: string;
    email?: string | null;
};

type ProgramAttendance = {
    id: number;
    program_registration_id: number;
    program_session_id: number;
    is_present: boolean;
    checked_in_at?: string | null;
    notes?: string | null;
};

type ProgramRegistration = {
    id: number;
    user_id?: number;
    status: string;
    registered_at?: string | null;
    user?: StaffUser | null;
    attendances?: ProgramAttendance[];
};

type ProgramSession = {
    id: number;
    program_id?: number;
    title: string;
    description?: string | null;
    location_name?: string | null;
    starts_at: string;
    ends_at?: string | null;
};

type Program = {
    id: number;
    region_id?: number | null;
    manager_id?: number | null;
    type: string;
    title: string;
    slug: string;
    description?: string | null;
    objectives?: string | null;
    location_name?: string | null;
    capacity?: number | null;
    registration_starts_at?: string | null;
    registration_ends_at?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    status: string;
    region?: Pick<Region, 'id' | 'name'> | null;
    manager?: StaffUser | null;
    sessions?: ProgramSession[];
    registrations?: ProgramRegistration[];
};

type Product = {
    id: number;
    product_category_id?: number;
    program_id?: number | null;
    name: string;
    slug: string;
    description?: string | null;
    point_price: number;
    stock: number;
    is_active: boolean;
    category?: NamedCategory | null;
    program?: Pick<Program, 'id' | 'title'> | null;
};

type RedemptionItem = {
    id?: number;
    product_id?: number;
    product_name: string;
    point_price: number;
    quantity: number;
    subtotal_points: number;
};

type Redemption = {
    id: number;
    number: string;
    status: string;
    total_points: number;
    notes?: string | null;
    created_at: string;
    processed_at?: string | null;
    user?: StaffUser | null;
    items?: RedemptionItem[];
};

type AuditLog = {
    id: number;
    event: string;
    auditable_type?: string | null;
    auditable_id?: number | null;
    actor?: StaffUser | null;
    actor_name?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    created_at: string;
};

type Props = {
    abilities?: Abilities;
    regions?: Region[];
    wasteCategories?: WasteCategory[];
    wasteTypes?: WasteType[];
    pointRules?: PointRule[];
    factorSets?: FactorSet[];
    staffUsers?: StaffUser[];
    educationCategories?: NamedCategory[];
    educationContents?: EducationContent[];
    programs?: Program[];
    productCategories?: NamedCategory[];
    products?: Product[];
    redemptions?: Redemption[];
    auditLogs?: AuditLog[];
};

type FieldOption = { value: string | number; label: string };
type FieldType =
    | 'text'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'url'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'hidden';

type EntityField = {
    name: string;
    label: string;
    type?: FieldType;
    defaultValue?: string | number | boolean | null;
    options?: FieldOption[];
    emptyLabel?: string;
    placeholder?: string;
    description?: string;
    required?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    wide?: boolean;
};

type EntityFormDialogProps = {
    title: string;
    description: string;
    triggerLabel: string;
    action: string;
    method?: 'post' | 'patch';
    fields: EntityField[];
    icon?: LucideIcon;
    variant?: 'default' | 'outline' | 'secondary';
    size?: 'default' | 'sm';
    submitLabel?: string;
    disabled?: boolean;
};

const regionLevelLabels: Record<string, string> = {
    village: 'Kelurahan / desa',
    rw: 'RW',
    rt: 'RT',
};

const statusLabels: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
    draft: 'Draf',
    published: 'Terbit',
    archived: 'Diarsipkan',
    registration_open: 'Pendaftaran dibuka',
    registration_closed: 'Pendaftaran ditutup',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    pending: 'Menunggu',
    processing: 'Diproses',
    ready: 'Siap diserahkan',
    confirmed: 'Terkonfirmasi',
    attended: 'Hadir',
    absent: 'Tidak hadir',
    carbon_kg_co2e: 'Karbon (kg CO2e)',
    recyclable_kg: 'Potensi daur ulang',
    energy_kwh: 'Energi (kWh)',
};

const sectionLinks = [
    { href: '#wilayah', label: 'Wilayah', icon: MapPinned },
    { href: '#sampah', label: 'Jenis sampah', icon: Trash2 },
    { href: '#poin', label: 'Aturan poin', icon: Coins },
    { href: '#faktor', label: 'Faktor dampak', icon: Leaf },
    { href: '#edukasi', label: 'Edukasi', icon: BookOpenCheck },
    { href: '#program', label: 'Program', icon: CalendarDays },
    { href: '#produk', label: 'Produk', icon: Boxes },
    { href: '#penukaran', label: 'Penukaran', icon: ReceiptText },
    { href: '#audit', label: 'Audit log', icon: ScrollText },
] as const;

const optionsOf = <T extends { id: number; name?: string; title?: string }>(
    items: T[],
): FieldOption[] =>
    items.map((item) => ({
        value: item.id,
        label: item.name ?? item.title ?? `#${item.id}`,
    }));

function datetimeValue(value?: string | null): string {
    if (!value) {
        return '';
    }

    return value.replace(' ', 'T').slice(0, 16);
}

function labelStatus(status: string): string {
    return statusLabels[status] ?? status.replaceAll('_', ' ');
}

function statusVariant(status: string) {
    if (['active', 'published', 'completed', 'ready'].includes(status)) {
        return 'default' as const;
    }

    if (['cancelled', 'inactive', 'absent'].includes(status)) {
        return 'destructive' as const;
    }

    return 'secondary' as const;
}

function EntityFormDialog({
    title,
    description,
    triggerLabel,
    action,
    method = 'post',
    fields,
    icon: Icon = Plus,
    variant = 'outline',
    size = 'sm',
    submitLabel = 'Simpan',
    disabled = false,
}: EntityFormDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant={variant}
                    size={size}
                    disabled={disabled}
                    aria-label={`${triggerLabel}: ${title}`}
                >
                    <Icon aria-hidden="true" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form
                    action={action}
                    method={method}
                    onSuccess={() => setOpen(false)}
                    className="space-y-5"
                >
                    {({ processing, errors }) => {
                        const fieldNames = new Set(
                            fields.map((field) => field.name),
                        );
                        const generalErrors = Object.entries(errors)
                            .filter(([name]) => !fieldNames.has(name))
                            .map(([, message]) => message);

                        return (
                            <>
                                {generalErrors.length > 0 && (
                                    <AlertError
                                        errors={generalErrors}
                                        title="Perubahan belum dapat disimpan."
                                    />
                                )}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {fields.map((field) => (
                                        <FormField
                                            key={field.name}
                                            field={field}
                                            error={errors[field.name]}
                                        />
                                    ))}
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            Batal
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <Spinner aria-hidden="true" />
                                        ) : (
                                            <Save aria-hidden="true" />
                                        )}
                                        {processing
                                            ? 'Menyimpan...'
                                            : submitLabel}
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    }}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function FormField({ field, error }: { field: EntityField; error?: string }) {
    const id = `master-${field.name}-${String(field.defaultValue ?? 'new')}`;

    if (field.type === 'hidden') {
        return (
            <input
                type="hidden"
                name={field.name}
                value={String(field.defaultValue ?? '')}
            />
        );
    }

    if (field.type === 'checkbox') {
        return (
            <div className={field.wide ? 'sm:col-span-2' : undefined}>
                <input type="hidden" name={field.name} value="0" />
                <label
                    htmlFor={id}
                    className="flex min-h-10 cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-3 text-sm"
                >
                    <input
                        id={id}
                        name={field.name}
                        type="checkbox"
                        value="1"
                        defaultChecked={Boolean(field.defaultValue)}
                        className="mt-0.5 size-4 rounded border-input accent-primary"
                    />
                    <span>
                        <span className="block font-medium">{field.label}</span>
                        {field.description && (
                            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                {field.description}
                            </span>
                        )}
                    </span>
                </label>
                <InputError message={error} />
            </div>
        );
    }

    return (
        <div className={field.wide ? 'sm:col-span-2' : undefined}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
                {field.label}
            </label>
            {field.type === 'textarea' ? (
                <textarea
                    id={id}
                    name={field.name}
                    defaultValue={String(field.defaultValue ?? '')}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
            ) : field.type === 'select' ? (
                <select
                    id={id}
                    name={field.name}
                    defaultValue={String(field.defaultValue ?? '')}
                    required={field.required}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    {field.emptyLabel && (
                        <option value="">{field.emptyLabel}</option>
                    )}
                    {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <Input
                    id={id}
                    name={field.name}
                    type={field.type ?? 'text'}
                    defaultValue={String(field.defaultValue ?? '')}
                    placeholder={field.placeholder}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                />
            )}
            {field.description && (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {field.description}
                </p>
            )}
            <InputError message={error} />
        </div>
    );
}

function SectionShell({
    id,
    icon: Icon,
    title,
    description,
    count,
    canManage,
    action,
    children,
}: {
    id: string;
    icon: LucideIcon;
    title: string;
    description: string;
    count: number;
    canManage: boolean;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-28 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold">{title}</h2>
                            <Badge variant="secondary">
                                {formatNumber(count, 0)} data
                            </Badge>
                            {!canManage && (
                                <Badge variant="outline">Baca saja</Badge>
                            )}
                        </div>
                        <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </div>
                {canManage && action && (
                    <div className="shrink-0">{action}</div>
                )}
            </div>
            {children}
        </section>
    );
}

function LockedEmpty({
    icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) {
    return <EmptyState icon={icon} title={title} description={description} />;
}

export default function MasterData({
    abilities = {},
    regions = [],
    wasteCategories = [],
    wasteTypes = [],
    pointRules = [],
    factorSets = [],
    staffUsers = [],
    educationCategories = [],
    educationContents = [],
    programs = [],
    productCategories = [],
    products = [],
    redemptions = [],
    auditLogs = [],
}: Props) {
    return (
        <>
            <Head title="Master Data & CMS" />
            <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Master data & CMS"
                    description="Kelola referensi wilayah, sampah, poin, faktor dampak, konten, program, produk, penukaran, dan jejak audit dari satu workspace. Hak mutasi mengikuti kewenangan akun."
                    action={
                        <Button asChild variant="outline">
                            <Link href="/admin/operations">
                                <ShieldCheck aria-hidden="true" />
                                Pusat administrasi
                            </Link>
                        </Button>
                    }
                />

                <nav
                    aria-label="Navigasi modul master data"
                    className="sticky top-2 z-20 -mx-1 overflow-x-auto rounded-2xl border bg-background/95 p-2 shadow-sm backdrop-blur"
                >
                    <div className="flex min-w-max gap-1">
                        {sectionLinks.map(({ href, label, icon: Icon }) => (
                            <Button
                                key={href}
                                asChild
                                variant="ghost"
                                size="sm"
                            >
                                <a href={href}>
                                    <Icon aria-hidden="true" />
                                    {label}
                                </a>
                            </Button>
                        ))}
                    </div>
                </nav>

                <RegionSection
                    regions={regions}
                    canManage={Boolean(abilities.regionsManage)}
                />
                <WasteSection
                    categories={wasteCategories}
                    wasteTypes={wasteTypes}
                    canManage={Boolean(abilities.wasteManage)}
                />
                <PointRuleSection
                    rules={pointRules}
                    wasteTypes={wasteTypes}
                    canManage={Boolean(abilities.factorsManage)}
                />
                <FactorSection
                    factorSets={factorSets}
                    regions={regions}
                    wasteTypes={wasteTypes}
                    canManage={Boolean(abilities.factorsManage)}
                />
                <EducationSection
                    categories={educationCategories}
                    contents={educationContents}
                    regions={regions}
                    canManage={Boolean(abilities.educationManage)}
                />
                <ProgramSection
                    programs={programs}
                    regions={regions}
                    staffUsers={staffUsers}
                    canManage={Boolean(abilities.programsManage)}
                />
                <ProductSection
                    categories={productCategories}
                    products={products}
                    programs={programs}
                    canManage={Boolean(abilities.productsManage)}
                />
                <RedemptionSection
                    redemptions={redemptions}
                    canManage={Boolean(abilities.redemptionsProcess)}
                />
                <AuditSection
                    logs={auditLogs}
                    canView={Boolean(abilities.auditView)}
                />
            </div>
        </>
    );
}

function RegionSection({
    regions,
    canManage,
}: {
    regions: Region[];
    canManage: boolean;
}) {
    const parentOptions = optionsOf(regions);
    const fields = (region?: Region): EntityField[] => [
        {
            name: 'parent_id',
            label: 'Wilayah induk',
            type: 'select',
            defaultValue: region?.parent_id,
            options: parentOptions.filter(
                (option) => option.value !== region?.id,
            ),
            emptyLabel: 'Tanpa induk',
        },
        {
            name: 'level',
            label: 'Tingkat wilayah',
            type: 'select',
            defaultValue: region?.level ?? 'village',
            options: [
                { value: 'village', label: 'Kelurahan / desa' },
                { value: 'rw', label: 'RW' },
                { value: 'rt', label: 'RT' },
            ],
            required: true,
        },
        {
            name: 'code',
            label: 'Kode',
            defaultValue: region?.code,
            required: true,
        },
        {
            name: 'name',
            label: 'Nama wilayah',
            defaultValue: region?.name,
            required: true,
        },
        {
            name: 'is_active',
            label: 'Wilayah aktif',
            type: 'checkbox',
            defaultValue: region?.is_active ?? true,
            description: 'Wilayah aktif dapat dipakai pada alur operasional.',
            wide: true,
        },
    ];

    return (
        <SectionShell
            id="wilayah"
            icon={MapPinned}
            title="Wilayah"
            description="Hierarki kelurahan, RW, dan RT yang menjadi dasar cakupan data serta penugasan."
            count={regions.length}
            canManage={canManage}
            action={
                <EntityFormDialog
                    title="Tambah wilayah"
                    description="Tentukan induk dan tingkat wilayah secara konsisten dengan hierarki yang berlaku."
                    triggerLabel="Tambah wilayah"
                    action="/admin/master-data/regions"
                    fields={fields()}
                />
            }
        >
            {regions.length > 0 ? (
                <div
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="eco-table-wrap">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Wilayah
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Tingkat
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Induk
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Status
                                    </th>
                                    <th
                                        className="px-5 py-3 text-right font-semibold"
                                        scope="col"
                                    >
                                        Tindakan
                                    </th>
                                </tr>
                            </thead>
                            <tbody
                                data-reveal-group="fade"
                                data-reveal-step="35"
                                className="divide-y [&>tr]:transition-colors [&>tr]:duration-200 [&>tr:hover]:bg-muted/40"
                            >
                                {regions.map((region) => {
                                    const parent = regions.find(
                                        (candidate) =>
                                            candidate.id === region.parent_id,
                                    );

                                    return (
                                        <tr
                                            key={region.id}
                                            className="hover:bg-muted/20"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold">
                                                    {region.name}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {region.code}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                {regionLevelLabels[
                                                    region.level
                                                ] ?? region.level}
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {parent?.name ?? 'Wilayah akar'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge
                                                    variant={
                                                        region.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {region.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {canManage ? (
                                                    <EntityFormDialog
                                                        title={`Ubah ${region.name}`}
                                                        description="Perubahan hierarki dapat memengaruhi cakupan operasional."
                                                        triggerLabel="Ubah"
                                                        action={`/admin/master-data/regions/${region.id}`}
                                                        method="patch"
                                                        fields={fields(region)}
                                                        icon={Pencil}
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        Baca saja
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <LockedEmpty
                    icon={MapPinned}
                    title="Belum ada wilayah"
                    description="Data wilayah belum tersedia untuk cakupan akun ini."
                />
            )}
        </SectionShell>
    );
}

function WasteSection({
    categories,
    wasteTypes,
    canManage,
}: {
    categories: WasteCategory[];
    wasteTypes: WasteType[];
    canManage: boolean;
}) {
    const categoryFields = (category?: WasteCategory): EntityField[] => [
        {
            name: 'name',
            label: 'Nama kategori',
            defaultValue: category?.name,
            required: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: category?.slug,
            required: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: category?.description,
            wide: true,
        },
        {
            name: 'sort_order',
            label: 'Urutan tampil',
            type: 'number',
            defaultValue: category?.sort_order ?? 0,
            min: 0,
            step: 1,
            required: true,
        },
        {
            name: 'is_hazardous',
            label: 'Kategori berbahaya (B3)',
            type: 'checkbox',
            defaultValue: category?.is_hazardous ?? false,
            description:
                'Aktifkan bila kategori membutuhkan penanganan khusus.',
        },
        {
            name: 'is_active',
            label: 'Kategori aktif',
            type: 'checkbox',
            defaultValue: category?.is_active ?? true,
        },
    ];
    const typeFields = (wasteType?: WasteType): EntityField[] => [
        {
            name: 'waste_category_id',
            label: 'Kategori',
            type: 'select',
            defaultValue: wasteType?.waste_category_id,
            options: optionsOf(categories),
            emptyLabel: 'Pilih kategori',
            required: true,
        },
        {
            name: 'name',
            label: 'Nama jenis sampah',
            defaultValue: wasteType?.name,
            required: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: wasteType?.slug,
            required: true,
        },
        {
            name: 'unit',
            label: 'Satuan',
            type: 'select',
            defaultValue: wasteType?.unit ?? 'kg',
            options: [{ value: 'kg', label: 'Kilogram (kg)' }],
            required: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: wasteType?.description,
            wide: true,
        },
        {
            name: 'handling_notes',
            label: 'Catatan penanganan',
            type: 'textarea',
            defaultValue: wasteType?.handling_notes,
            wide: true,
        },
        {
            name: 'is_active',
            label: 'Jenis sampah aktif',
            type: 'checkbox',
            defaultValue: wasteType?.is_active ?? true,
            wide: true,
        },
    ];

    return (
        <SectionShell
            id="sampah"
            icon={Trash2}
            title="Kategori & jenis sampah"
            description="Taksonomi operasional untuk permintaan, penimbangan, aturan poin, dan perhitungan dampak."
            count={categories.length + wasteTypes.length}
            canManage={canManage}
            action={
                <div className="flex flex-wrap gap-2">
                    <EntityFormDialog
                        title="Tambah kategori sampah"
                        description="Kategori mengelompokkan jenis sampah dan menandai kebutuhan penanganan B3."
                        triggerLabel="Kategori"
                        action="/admin/master-data/waste-categories"
                        fields={categoryFields()}
                    />
                    <EntityFormDialog
                        title="Tambah jenis sampah"
                        description="Jenis sampah menjadi referensi pada penimbangan, poin, dan faktor dampak."
                        triggerLabel="Jenis sampah"
                        action="/admin/master-data/waste-types"
                        fields={typeFields()}
                        disabled={categories.length === 0}
                    />
                </div>
            }
        >
            {categories.length > 0 || wasteTypes.length > 0 ? (
                <div
                    className="grid gap-4 xl:grid-cols-2"
                    data-reveal-group="up"
                >
                    {categories.map((category) => {
                        const categoryTypes = wasteTypes.filter(
                            (type) => type.waste_category_id === category.id,
                        );

                        return (
                            <article
                                key={category.id}
                                className="eco-card overflow-hidden"
                            >
                                <div className="flex items-start justify-between gap-3 border-b p-5">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold">
                                                {category.name}
                                            </h3>
                                            {category.is_hazardous && (
                                                <Badge variant="destructive">
                                                    B3
                                                </Badge>
                                            )}
                                            <Badge
                                                variant={
                                                    category.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {category.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {category.slug} ·{' '}
                                            {categoryTypes.length} jenis
                                        </p>
                                    </div>
                                    {canManage && (
                                        <EntityFormDialog
                                            title={`Ubah kategori ${category.name}`}
                                            description="Perbarui identitas, urutan, atau status kategori."
                                            triggerLabel="Ubah"
                                            action={`/admin/master-data/waste-categories/${category.id}`}
                                            method="patch"
                                            fields={categoryFields(category)}
                                            icon={Pencil}
                                        />
                                    )}
                                </div>
                                {category.description && (
                                    <p className="border-b px-5 py-3 text-sm leading-6 text-muted-foreground">
                                        {category.description}
                                    </p>
                                )}
                                <div
                                    className="divide-y"
                                    data-reveal-group="up"
                                    data-reveal-distance="xs"
                                    data-reveal-step="40"
                                >
                                    {categoryTypes.length > 0 ? (
                                        categoryTypes.map((wasteType) => (
                                            <div
                                                key={wasteType.id}
                                                className="flex items-start justify-between gap-3 px-5 py-4"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium">
                                                            {wasteType.name}
                                                        </p>
                                                        <Badge variant="outline">
                                                            {wasteType.unit}
                                                        </Badge>
                                                        {!wasteType.is_active && (
                                                            <Badge variant="secondary">
                                                                Nonaktif
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {(wasteType.handling_notes ??
                                                        wasteType.description) && (
                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                                            {wasteType.handling_notes ??
                                                                wasteType.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {canManage && (
                                                    <EntityFormDialog
                                                        title={`Ubah ${wasteType.name}`}
                                                        description="Perubahan berlaku pada pemilihan jenis sampah berikutnya."
                                                        triggerLabel="Ubah"
                                                        action={`/admin/master-data/waste-types/${wasteType.id}`}
                                                        method="patch"
                                                        fields={typeFields(
                                                            wasteType,
                                                        )}
                                                        icon={Pencil}
                                                    />
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                                            Belum ada jenis sampah pada kategori
                                            ini.
                                        </p>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <LockedEmpty
                    icon={Trash2}
                    title="Taksonomi sampah belum tersedia"
                    description="Tambahkan kategori sebelum membuat jenis sampah."
                />
            )}
        </SectionShell>
    );
}

function PointRuleSection({
    rules,
    wasteTypes,
    canManage,
}: {
    rules: PointRule[];
    wasteTypes: WasteType[];
    canManage: boolean;
}) {
    const fields: EntityField[] = [
        {
            name: 'waste_type_id',
            label: 'Jenis sampah',
            type: 'select',
            options: optionsOf(wasteTypes),
            emptyLabel: 'Pilih jenis sampah',
            required: true,
        },
        {
            name: 'version',
            label: 'Versi',
            type: 'number',
            min: 1,
            step: 1,
            required: true,
        },
        {
            name: 'points_per_kg',
            label: 'Poin per kg',
            type: 'number',
            min: 0,
            step: 0.0001,
            required: true,
        },
        {
            name: 'effective_from',
            label: 'Berlaku mulai',
            type: 'datetime-local',
            required: true,
        },
        {
            name: 'effective_to',
            label: 'Berlaku sampai',
            type: 'datetime-local',
        },
        {
            name: 'is_active',
            label: 'Aturan aktif',
            type: 'checkbox',
            defaultValue: true,
        },
    ];

    return (
        <SectionShell
            id="poin"
            icon={Coins}
            title="Aturan poin"
            description="Aturan berversi menjaga histori perhitungan. Buat versi baru untuk perubahan tarif; data lama tidak ditimpa."
            count={rules.length}
            canManage={canManage}
            action={
                <EntityFormDialog
                    title="Buat aturan poin"
                    description="Pastikan rentang efektif tidak bertabrakan dengan aturan aktif untuk jenis sampah yang sama."
                    triggerLabel="Aturan baru"
                    action="/admin/master-data/point-rules"
                    fields={fields}
                    disabled={wasteTypes.length === 0}
                />
            }
        >
            {rules.length > 0 ? (
                <div
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="eco-table-wrap">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Jenis sampah
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Versi
                                    </th>
                                    <th
                                        className="px-5 py-3 text-right font-semibold"
                                        scope="col"
                                    >
                                        Poin / kg
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Masa berlaku
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody
                                data-reveal-group="fade"
                                data-reveal-step="35"
                                className="divide-y [&>tr]:transition-colors [&>tr]:duration-200 [&>tr:hover]:bg-muted/40"
                            >
                                {rules.map((rule) => {
                                    const wasteType =
                                        rule.waste_type ??
                                        wasteTypes.find(
                                            (item) =>
                                                item.id === rule.waste_type_id,
                                        );

                                    return (
                                        <tr
                                            key={rule.id}
                                            className="hover:bg-muted/20"
                                        >
                                            <td className="px-5 py-4 font-medium">
                                                {wasteType?.name ??
                                                    `#${rule.waste_type_id}`}
                                            </td>
                                            <td className="px-5 py-4">
                                                v{rule.version}
                                            </td>
                                            <td className="px-5 py-4 text-right font-bold tabular-nums">
                                                {formatNumber(
                                                    Number(rule.points_per_kg),
                                                    4,
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                <span className="block">
                                                    {formatDate(
                                                        rule.effective_from,
                                                        true,
                                                    )}
                                                </span>
                                                <span className="mt-0.5 block text-xs">
                                                    hingga{' '}
                                                    {rule.effective_to
                                                        ? formatDate(
                                                              rule.effective_to,
                                                              true,
                                                          )
                                                        : 'tanpa batas'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge
                                                    variant={
                                                        rule.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {rule.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <LockedEmpty
                    icon={Coins}
                    title="Belum ada aturan poin"
                    description="Aturan poin belum dikonfigurasi untuk jenis sampah yang tersedia."
                />
            )}
        </SectionShell>
    );
}

function FactorSection({
    factorSets,
    regions,
    wasteTypes,
    canManage,
}: {
    factorSets: FactorSet[];
    regions: Region[];
    wasteTypes: WasteType[];
    canManage: boolean;
}) {
    const setFields = (set?: FactorSet): EntityField[] => [
        {
            name: 'region_id',
            label: 'Cakupan wilayah',
            type: 'select',
            defaultValue: set?.region_id,
            options: optionsOf(regions),
            emptyLabel: 'Global / semua wilayah',
        },
        {
            name: 'name',
            label: 'Nama factor set',
            defaultValue: set?.name,
            required: true,
        },
        {
            name: 'version',
            label: 'Versi',
            type: 'number',
            defaultValue: set?.version,
            min: 1,
            step: 1,
            required: true,
        },
        set
            ? {
                  name: 'status',
                  label: 'Status',
                  type: 'select',
                  defaultValue: set.status,
                  options: [
                      { value: 'draft', label: 'Draf' },
                      { value: 'active', label: 'Aktif' },
                      { value: 'archived', label: 'Diarsipkan' },
                  ],
                  required: true,
              }
            : {
                  name: 'status',
                  label: 'Status',
                  type: 'hidden',
                  defaultValue: 'draft',
              },
        {
            name: 'source_name',
            label: 'Nama sumber',
            defaultValue: set?.source_name,
            required: true,
        },
        {
            name: 'source_url',
            label: 'URL sumber',
            type: 'url',
            defaultValue: set?.source_url,
        },
        {
            name: 'effective_from',
            label: 'Berlaku mulai',
            type: 'datetime-local',
            defaultValue: datetimeValue(set?.effective_from),
        },
        {
            name: 'effective_to',
            label: 'Berlaku sampai',
            type: 'datetime-local',
            defaultValue: datetimeValue(set?.effective_to),
        },
        {
            name: 'methodology_notes',
            label: 'Catatan metodologi',
            type: 'textarea',
            defaultValue: set?.methodology_notes,
            wide: true,
        },
        {
            name: 'scope_notes',
            label: 'Catatan cakupan',
            type: 'textarea',
            defaultValue: set?.scope_notes,
            wide: true,
        },
        {
            name: 'is_demo',
            label: 'Data demonstrasi',
            type: 'checkbox',
            defaultValue: set?.is_demo ?? false,
            description:
                'Tandai jelas bila nilai tidak layak dipakai untuk klaim ilmiah.',
            wide: true,
        },
    ];
    const factorFields = (
        set: FactorSet,
        factor?: EnvironmentalFactor,
    ): EntityField[] => [
        {
            name: 'environmental_factor_set_id',
            label: 'Factor set',
            type: 'hidden',
            defaultValue: set.id,
        },
        {
            name: 'waste_type_id',
            label: 'Jenis sampah',
            type: 'select',
            defaultValue: factor?.waste_type_id,
            options: optionsOf(wasteTypes),
            emptyLabel: 'Pilih jenis sampah',
            required: true,
        },
        {
            name: 'impact_kind',
            label: 'Jenis dampak',
            type: 'select',
            defaultValue: factor?.impact_kind,
            options: [
                { value: 'carbon_kg_co2e', label: 'Karbon (kg CO2e)' },
                { value: 'recyclable_kg', label: 'Potensi daur ulang' },
                { value: 'energy_kwh', label: 'Energi (kWh)' },
            ],
            emptyLabel: 'Pilih jenis dampak',
            required: true,
        },
        {
            name: 'factor_value',
            label: 'Nilai faktor',
            type: 'number',
            defaultValue: factor?.factor_value,
            step: 0.00000001,
            required: true,
        },
        {
            name: 'unit',
            label: 'Satuan faktor',
            defaultValue: factor?.unit,
            required: true,
        },
        {
            name: 'notes',
            label: 'Catatan faktor',
            type: 'textarea',
            defaultValue: factor?.notes,
            wide: true,
        },
    ];

    return (
        <SectionShell
            id="faktor"
            icon={Leaf}
            title="Factor set & faktor dampak"
            description="Sumber, metodologi, cakupan, periode efektif, serta faktor per jenis sampah harus dapat ditelusuri."
            count={
                factorSets.length +
                factorSets.reduce(
                    (total, set) => total + (set.factors?.length ?? 0),
                    0,
                )
            }
            canManage={canManage}
            action={
                <EntityFormDialog
                    title="Tambah factor set"
                    description="Catat sumber dan batas penggunaan sebelum factor set diaktifkan."
                    triggerLabel="Factor set"
                    action="/admin/master-data/factor-sets"
                    fields={setFields()}
                />
            }
        >
            {factorSets.length > 0 ? (
                <div className="space-y-4">
                    {factorSets.map((set) => (
                        <article
                            key={set.id}
                            className="eco-card overflow-hidden"
                        >
                            <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold">
                                            {set.name}
                                        </h3>
                                        <Badge
                                            variant={statusVariant(set.status)}
                                        >
                                            {labelStatus(set.status)}
                                        </Badge>
                                        <Badge variant="outline">
                                            v{set.version}
                                        </Badge>
                                        {set.is_demo && (
                                            <Badge variant="destructive">
                                                Demo
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {set.region?.name ?? 'Cakupan global'} ·{' '}
                                        {set.source_name}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {set.effective_from
                                            ? formatDate(set.effective_from)
                                            : 'Awal berlaku belum ditentukan'}{' '}
                                        —{' '}
                                        {set.effective_to
                                            ? formatDate(set.effective_to)
                                            : 'tanpa batas akhir'}
                                    </p>
                                </div>
                                {canManage && (
                                    <div className="flex flex-wrap gap-2">
                                        {set.status === 'draft' && (
                                            <EntityFormDialog
                                                title={`Tambah faktor ke ${set.name}`}
                                                description="Kombinasi jenis sampah dan jenis dampak harus unik dalam satu factor set."
                                                triggerLabel="Faktor"
                                                action="/admin/master-data/environmental-factors"
                                                fields={factorFields(set)}
                                                disabled={
                                                    wasteTypes.length === 0
                                                }
                                            />
                                        )}
                                        <EntityFormDialog
                                            title={`Ubah ${set.name}`}
                                            description="Perubahan status atau metodologi harus tetap menjaga keterlacakan data."
                                            triggerLabel="Ubah set"
                                            action={`/admin/master-data/factor-sets/${set.id}`}
                                            method="patch"
                                            fields={setFields(set)}
                                            icon={Pencil}
                                        />
                                    </div>
                                )}
                            </div>
                            {(set.methodology_notes ?? set.scope_notes) && (
                                <div className="grid gap-3 border-b bg-muted/20 px-5 py-4 text-sm md:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Metodologi
                                        </p>
                                        <p className="mt-1 leading-6">
                                            {set.methodology_notes ??
                                                'Belum dicatat'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Cakupan
                                        </p>
                                        <p className="mt-1 leading-6">
                                            {set.scope_notes ?? 'Belum dicatat'}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="40"
                            >
                                {(set.factors ?? []).length > 0 ? (
                                    set.factors?.map((factor) => {
                                        const wasteType =
                                            factor.waste_type ??
                                            wasteTypes.find(
                                                (item) =>
                                                    item.id ===
                                                    factor.waste_type_id,
                                            );

                                        return (
                                            <div
                                                key={factor.id}
                                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="grid flex-1 gap-1 sm:grid-cols-3 sm:gap-4">
                                                    <p className="font-medium">
                                                        {wasteType?.name ??
                                                            `#${factor.waste_type_id}`}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {labelStatus(
                                                            factor.impact_kind,
                                                        )}
                                                    </p>
                                                    <p className="font-semibold tabular-nums">
                                                        {formatNumber(
                                                            Number(
                                                                factor.factor_value,
                                                            ),
                                                            8,
                                                        )}{' '}
                                                        <span className="font-normal text-muted-foreground">
                                                            {factor.unit}
                                                        </span>
                                                    </p>
                                                </div>
                                                {canManage &&
                                                    set.status === 'draft' && (
                                                        <EntityFormDialog
                                                            title={`Ubah faktor ${wasteType?.name ?? ''}`}
                                                            description="Simpan hanya nilai yang memiliki dasar dan satuan yang jelas."
                                                            triggerLabel="Ubah"
                                                            action={`/admin/master-data/environmental-factors/${factor.id}`}
                                                            method="patch"
                                                            fields={factorFields(
                                                                set,
                                                                factor,
                                                            )}
                                                            icon={Pencil}
                                                        />
                                                    )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                                        Belum ada faktor dalam set ini.
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <LockedEmpty
                    icon={Leaf}
                    title="Factor set belum tersedia"
                    description="Belum ada sumber dan metodologi faktor dampak yang dapat ditampilkan."
                />
            )}
        </SectionShell>
    );
}

function EducationSection({
    categories,
    contents,
    regions,
    canManage,
}: {
    categories: NamedCategory[];
    contents: EducationContent[];
    regions: Region[];
    canManage: boolean;
}) {
    const categoryFields = (category?: NamedCategory): EntityField[] => [
        {
            name: 'name',
            label: 'Nama kategori',
            defaultValue: category?.name,
            required: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: category?.slug,
            required: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: category?.description,
            wide: true,
        },
    ];
    const contentFields = (content?: EducationContent): EntityField[] => [
        {
            name: 'education_category_id',
            label: 'Kategori edukasi',
            type: 'select',
            defaultValue:
                content?.education_category_id ?? content?.category?.id,
            options: optionsOf(categories),
            emptyLabel: 'Pilih kategori',
            required: true,
        },
        {
            name: 'region_id',
            label: 'Cakupan wilayah',
            type: 'select',
            defaultValue: content?.region_id ?? content?.region?.id,
            options: optionsOf(regions),
            emptyLabel: 'Publik / semua wilayah',
        },
        {
            name: 'title',
            label: 'Judul',
            defaultValue: content?.title,
            required: true,
            wide: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: content?.slug,
            required: true,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: content?.status ?? 'draft',
            options: [
                { value: 'draft', label: 'Draf' },
                { value: 'published', label: 'Terbit' },
                { value: 'archived', label: 'Diarsipkan' },
            ],
            required: true,
        },
        {
            name: 'excerpt',
            label: 'Ringkasan',
            type: 'textarea',
            defaultValue: content?.excerpt,
            wide: true,
        },
        {
            name: 'body',
            label: 'Isi materi',
            type: 'textarea',
            defaultValue: content?.body,
            required: true,
            wide: true,
        },
        {
            name: 'external_url',
            label: 'Tautan eksternal',
            type: 'url',
            defaultValue: content?.external_url,
        },
        {
            name: 'published_at',
            label: 'Waktu terbit',
            type: 'datetime-local',
            defaultValue: datetimeValue(content?.published_at),
        },
    ];

    return (
        <SectionShell
            id="edukasi"
            icon={BookOpenCheck}
            title="Edukasi"
            description="Kelola kategori dan materi edukasi tanpa mencampur status draf, publikasi, dan arsip."
            count={categories.length + contents.length}
            canManage={canManage}
            action={
                <div className="flex flex-wrap gap-2">
                    <EntityFormDialog
                        title="Tambah kategori edukasi"
                        description="Kategori membantu warga menemukan materi sesuai topik."
                        triggerLabel="Kategori"
                        action="/admin/master-data/education-categories"
                        fields={categoryFields()}
                    />
                    <EntityFormDialog
                        title="Tambah materi edukasi"
                        description="Materi baru disimpan sesuai status dan cakupan wilayah yang dipilih."
                        triggerLabel="Materi"
                        action="/admin/master-data/education"
                        fields={contentFields()}
                        disabled={categories.length === 0}
                    />
                </div>
            }
        >
            <div
                className="grid gap-4 xl:grid-cols-[.7fr_1.3fr]"
                data-reveal-group="up"
            >
                <div
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="border-b p-5">
                        <h3 className="font-semibold">Kategori edukasi</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {categories.length} kategori tersedia
                        </p>
                    </div>
                    {categories.length > 0 ? (
                        <div
                            className="divide-y"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex items-start justify-between gap-3 px-5 py-4"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {category.name}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {category.slug}
                                        </p>
                                    </div>
                                    {canManage && (
                                        <EntityFormDialog
                                            title={`Ubah kategori ${category.name}`}
                                            description="Perbarui kategori tanpa mengubah materi yang sudah terhubung."
                                            triggerLabel="Ubah"
                                            action={`/admin/master-data/education-categories/${category.id}`}
                                            method="patch"
                                            fields={categoryFields(category)}
                                            icon={Pencil}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-5">
                            <EmptyState
                                icon={BookOpenCheck}
                                title="Belum ada kategori"
                                description="Kategori edukasi belum tersedia."
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {contents.length > 0 ? (
                        contents.map((content) => (
                            <article key={content.id} className="eco-card p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold">
                                                {content.title}
                                            </h3>
                                            <Badge
                                                variant={statusVariant(
                                                    content.status,
                                                )}
                                            >
                                                {labelStatus(content.status)}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {content.category?.name ??
                                                `Kategori #${content.education_category_id ?? '—'}`}{' '}
                                            ·{' '}
                                            {content.region?.name ??
                                                'Semua wilayah'}
                                        </p>
                                        {content.excerpt && (
                                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                                {content.excerpt}
                                            </p>
                                        )}
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {content.published_at
                                                ? `Terbit ${formatDate(content.published_at, true)}`
                                                : 'Belum dijadwalkan terbit'}
                                            {content.author?.name
                                                ? ` · ${content.author.name}`
                                                : ''}
                                        </p>
                                    </div>
                                    {canManage && (
                                        <EntityFormDialog
                                            title={`Ubah ${content.title}`}
                                            description="Periksa kembali status, cakupan, dan waktu terbit sebelum menyimpan."
                                            triggerLabel="Ubah"
                                            action={`/admin/master-data/education/${content.id}`}
                                            method="patch"
                                            fields={contentFields(content)}
                                            icon={Pencil}
                                        />
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <EmptyState
                            icon={BookOpenCheck}
                            title="Materi edukasi belum tersedia"
                            description="Belum ada materi untuk cakupan akun ini."
                        />
                    )}
                </div>
            </div>
        </SectionShell>
    );
}

function ProgramSection({
    programs,
    regions,
    staffUsers,
    canManage,
}: {
    programs: Program[];
    regions: Region[];
    staffUsers: StaffUser[];
    canManage: boolean;
}) {
    const programFields = (program?: Program): EntityField[] => [
        {
            name: 'region_id',
            label: 'Wilayah',
            type: 'select',
            defaultValue: program?.region_id ?? program?.region?.id,
            options: optionsOf(regions),
            emptyLabel: 'Semua wilayah',
        },
        {
            name: 'manager_id',
            label: 'Pengelola program',
            type: 'select',
            defaultValue: program?.manager_id ?? program?.manager?.id,
            options: optionsOf(staffUsers),
            emptyLabel: 'Belum ditentukan',
        },
        {
            name: 'type',
            label: 'Tipe program',
            type: 'select',
            defaultValue: program?.type ?? 'general',
            options: [
                { value: 'eco_pore', label: 'EcoPore' },
                { value: 'eco_cycle', label: 'EcoCycle' },
                { value: 'general', label: 'Umum' },
            ],
            required: true,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: program?.status ?? 'draft',
            options: [
                { value: 'draft', label: 'Draf' },
                { value: 'published', label: 'Terbit' },
                { value: 'registration_open', label: 'Pendaftaran dibuka' },
                { value: 'registration_closed', label: 'Pendaftaran ditutup' },
                { value: 'completed', label: 'Selesai' },
                { value: 'cancelled', label: 'Dibatalkan' },
            ],
            required: true,
        },
        {
            name: 'title',
            label: 'Judul program',
            defaultValue: program?.title,
            required: true,
            wide: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: program?.slug,
            required: true,
        },
        {
            name: 'capacity',
            label: 'Kapasitas',
            type: 'number',
            defaultValue: program?.capacity,
            min: 1,
            step: 1,
        },
        {
            name: 'location_name',
            label: 'Lokasi kegiatan',
            defaultValue: program?.location_name,
            wide: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: program?.description,
            required: true,
            wide: true,
        },
        {
            name: 'objectives',
            label: 'Tujuan',
            type: 'textarea',
            defaultValue: program?.objectives,
            wide: true,
        },
        {
            name: 'registration_starts_at',
            label: 'Pendaftaran mulai',
            type: 'datetime-local',
            defaultValue: datetimeValue(program?.registration_starts_at),
        },
        {
            name: 'registration_ends_at',
            label: 'Pendaftaran berakhir',
            type: 'datetime-local',
            defaultValue: datetimeValue(program?.registration_ends_at),
        },
        {
            name: 'starts_at',
            label: 'Program mulai',
            type: 'datetime-local',
            defaultValue: datetimeValue(program?.starts_at),
        },
        {
            name: 'ends_at',
            label: 'Program berakhir',
            type: 'datetime-local',
            defaultValue: datetimeValue(program?.ends_at),
        },
    ];
    const sessionFields = (
        program: Program,
        session?: ProgramSession,
    ): EntityField[] => [
        {
            name: 'program_id',
            label: 'Program',
            type: 'hidden',
            defaultValue: program.id,
        },
        {
            name: 'title',
            label: 'Judul sesi',
            defaultValue: session?.title,
            required: true,
            wide: true,
        },
        {
            name: 'location_name',
            label: 'Lokasi sesi',
            defaultValue: session?.location_name,
            wide: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: session?.description,
            wide: true,
        },
        {
            name: 'starts_at',
            label: 'Mulai',
            type: 'datetime-local',
            defaultValue: datetimeValue(session?.starts_at),
            required: true,
        },
        {
            name: 'ends_at',
            label: 'Selesai',
            type: 'datetime-local',
            defaultValue: datetimeValue(session?.ends_at),
        },
    ];
    const attendanceFields = (
        registration: ProgramRegistration,
        session: ProgramSession,
        attendance?: ProgramAttendance,
    ): EntityField[] => [
        {
            name: 'program_registration_id',
            label: 'Pendaftaran',
            type: 'hidden',
            defaultValue: registration.id,
        },
        {
            name: 'program_session_id',
            label: 'Sesi',
            type: 'hidden',
            defaultValue: session.id,
        },
        {
            name: 'is_present',
            label: 'Peserta hadir',
            type: 'checkbox',
            defaultValue: attendance?.is_present ?? true,
            description: `Kehadiran untuk sesi ${session.title}.`,
            wide: true,
        },
        {
            name: 'checked_in_at',
            label: 'Waktu check-in',
            type: 'datetime-local',
            defaultValue: datetimeValue(attendance?.checked_in_at),
        },
        {
            name: 'notes',
            label: 'Catatan kehadiran',
            type: 'textarea',
            defaultValue: attendance?.notes,
            wide: true,
        },
    ];

    return (
        <SectionShell
            id="program"
            icon={CalendarDays}
            title="Program, sesi & kehadiran"
            description="Program menjadi induk jadwal, pendaftaran, dan pencatatan kehadiran setiap sesi."
            count={
                programs.length +
                programs.reduce(
                    (total, program) =>
                        total +
                        (program.sessions?.length ?? 0) +
                        (program.registrations?.length ?? 0),
                    0,
                )
            }
            canManage={canManage}
            action={
                <EntityFormDialog
                    title="Tambah program"
                    description="Atur cakupan, pengelola, jadwal, kapasitas, dan status publikasi."
                    triggerLabel="Tambah program"
                    action="/admin/master-data/programs"
                    fields={programFields()}
                />
            }
        >
            {programs.length > 0 ? (
                <div className="space-y-5">
                    {programs.map((program) => {
                        const sessions = program.sessions ?? [];
                        const registrations = program.registrations ?? [];

                        return (
                            <article
                                key={program.id}
                                className="eco-card overflow-hidden"
                            >
                                <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold">
                                                {program.title}
                                            </h3>
                                            <Badge
                                                variant={statusVariant(
                                                    program.status,
                                                )}
                                            >
                                                {labelStatus(program.status)}
                                            </Badge>
                                            <Badge variant="outline">
                                                {program.type.replaceAll(
                                                    '_',
                                                    ' ',
                                                )}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {program.region?.name ??
                                                'Semua wilayah'}
                                            {program.location_name
                                                ? ` · ${program.location_name}`
                                                : ''}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {program.starts_at
                                                ? formatDate(
                                                      program.starts_at,
                                                      true,
                                                  )
                                                : 'Jadwal utama belum ditentukan'}{' '}
                                            · {registrations.length} pendaftar ·{' '}
                                            {sessions.length} sesi
                                        </p>
                                    </div>
                                    {canManage && (
                                        <div className="flex flex-wrap gap-2">
                                            <EntityFormDialog
                                                title={`Tambah sesi ${program.title}`}
                                                description="Sesi wajib berada dalam rentang program yang relevan."
                                                triggerLabel="Sesi"
                                                action="/admin/master-data/program-sessions"
                                                fields={sessionFields(program)}
                                            />
                                            <EntityFormDialog
                                                title={`Ubah ${program.title}`}
                                                description="Periksa dampak perubahan jadwal terhadap pendaftar dan sesi."
                                                triggerLabel="Ubah program"
                                                action={`/admin/master-data/programs/${program.id}`}
                                                method="patch"
                                                fields={programFields(program)}
                                                icon={Pencil}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid divide-y xl:grid-cols-2 xl:divide-x xl:divide-y-0">
                                    <div>
                                        <div className="flex items-center gap-2 border-b bg-muted/20 px-5 py-3">
                                            <FileClock
                                                className="size-4 text-primary"
                                                aria-hidden="true"
                                            />
                                            <h4 className="text-sm font-semibold">
                                                Sesi program
                                            </h4>
                                        </div>
                                        {sessions.length > 0 ? (
                                            <div
                                                className="divide-y"
                                                data-reveal-group="up"
                                                data-reveal-distance="xs"
                                                data-reveal-step="40"
                                            >
                                                {sessions.map((session) => (
                                                    <div
                                                        key={session.id}
                                                        className="flex items-start justify-between gap-3 px-5 py-4"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-medium">
                                                                {session.title}
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {formatDate(
                                                                    session.starts_at,
                                                                    true,
                                                                )}
                                                                {session.ends_at
                                                                    ? ` — ${formatDate(session.ends_at, true)}`
                                                                    : ''}
                                                            </p>
                                                            {session.location_name && (
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {
                                                                        session.location_name
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                        {canManage && (
                                                            <EntityFormDialog
                                                                title={`Ubah sesi ${session.title}`}
                                                                description="Perubahan sesi harus dikomunikasikan kepada peserta."
                                                                triggerLabel="Ubah"
                                                                action={`/admin/master-data/program-sessions/${session.id}`}
                                                                method="patch"
                                                                fields={sessionFields(
                                                                    program,
                                                                    session,
                                                                )}
                                                                icon={Pencil}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                                                Belum ada sesi.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 border-b bg-muted/20 px-5 py-3">
                                            <UsersRound
                                                className="size-4 text-primary"
                                                aria-hidden="true"
                                            />
                                            <h4 className="text-sm font-semibold">
                                                Pendaftar & kehadiran
                                            </h4>
                                        </div>
                                        {registrations.length > 0 ? (
                                            <div
                                                className="divide-y"
                                                data-reveal-group="up"
                                                data-reveal-distance="xs"
                                                data-reveal-step="40"
                                            >
                                                {registrations.map(
                                                    (registration) => (
                                                        <ProgramRegistrationRow
                                                            key={
                                                                registration.id
                                                            }
                                                            registration={
                                                                registration
                                                            }
                                                            sessions={sessions}
                                                            canManage={
                                                                canManage
                                                            }
                                                            attendanceFields={
                                                                attendanceFields
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                                                Belum ada pendaftar.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <LockedEmpty
                    icon={CalendarDays}
                    title="Program belum tersedia"
                    description="Belum ada program yang dapat ditampilkan untuk cakupan akun ini."
                />
            )}
        </SectionShell>
    );
}

function ProgramRegistrationRow({
    registration,
    sessions,
    canManage,
    attendanceFields,
}: {
    registration: ProgramRegistration;
    sessions: ProgramSession[];
    canManage: boolean;
    attendanceFields: (
        registration: ProgramRegistration,
        session: ProgramSession,
        attendance?: ProgramAttendance,
    ) => EntityField[];
}) {
    return (
        <div className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="font-medium">
                        {registration.user?.name ??
                            `Pendaftaran #${registration.id}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {registration.user?.email ??
                            (registration.registered_at
                                ? formatDate(registration.registered_at, true)
                                : 'Identitas peserta tidak tersedia')}
                    </p>
                </div>
                <Badge variant={statusVariant(registration.status)}>
                    {labelStatus(registration.status)}
                </Badge>
            </div>
            {sessions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {sessions.map((session) => {
                        const attendance = registration.attendances?.find(
                            (item) => item.program_session_id === session.id,
                        );

                        if (!canManage) {
                            return attendance ? (
                                <Badge
                                    key={session.id}
                                    variant={
                                        attendance.is_present
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {session.title}:{' '}
                                    {attendance.is_present
                                        ? 'hadir'
                                        : 'tidak hadir'}
                                </Badge>
                            ) : null;
                        }

                        return (
                            <EntityFormDialog
                                key={session.id}
                                title={`${attendance ? 'Ubah' : 'Catat'} kehadiran`}
                                description={`${registration.user?.name ?? `Pendaftaran #${registration.id}`} · ${session.title}`}
                                triggerLabel={
                                    attendance
                                        ? `${session.title}: ${attendance.is_present ? 'hadir' : 'tidak hadir'}`
                                        : `Catat ${session.title}`
                                }
                                action={
                                    attendance
                                        ? `/admin/master-data/program-attendances/${attendance.id}`
                                        : '/admin/master-data/program-attendances'
                                }
                                method={attendance ? 'patch' : 'post'}
                                fields={attendanceFields(
                                    registration,
                                    session,
                                    attendance,
                                )}
                                icon={ClipboardCheck}
                                variant={attendance ? 'secondary' : 'outline'}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ProductSection({
    categories,
    products,
    programs,
    canManage,
}: {
    categories: NamedCategory[];
    products: Product[];
    programs: Program[];
    canManage: boolean;
}) {
    const categoryFields = (category?: NamedCategory): EntityField[] => [
        {
            name: 'name',
            label: 'Nama kategori',
            defaultValue: category?.name,
            required: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: category?.slug,
            required: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: category?.description,
            wide: true,
        },
    ];
    const productFields = (product?: Product): EntityField[] => [
        {
            name: 'product_category_id',
            label: 'Kategori produk',
            type: 'select',
            defaultValue: product?.product_category_id ?? product?.category?.id,
            options: optionsOf(categories),
            emptyLabel: 'Pilih kategori',
            required: true,
        },
        {
            name: 'program_id',
            label: 'Program terkait',
            type: 'select',
            defaultValue: product?.program_id ?? product?.program?.id,
            options: optionsOf(programs),
            emptyLabel: 'Tidak terkait program',
        },
        {
            name: 'name',
            label: 'Nama produk',
            defaultValue: product?.name,
            required: true,
            wide: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            defaultValue: product?.slug,
            required: true,
        },
        {
            name: 'point_price',
            label: 'Harga poin',
            type: 'number',
            defaultValue: product?.point_price,
            min: 0,
            step: 1,
            required: true,
        },
        {
            name: 'description',
            label: 'Deskripsi',
            type: 'textarea',
            defaultValue: product?.description,
            wide: true,
        },
        {
            name: 'is_active',
            label: 'Produk aktif',
            type: 'checkbox',
            defaultValue: product?.is_active ?? true,
            description:
                'Produk aktif dapat ditampilkan dan ditukar bila stok mencukupi.',
            wide: true,
        },
    ];
    const inventoryFields = (product: Product): EntityField[] => [
        {
            name: 'product_id',
            label: 'Produk',
            type: 'hidden',
            defaultValue: product.id,
        },
        {
            name: 'type',
            label: 'Jenis pergerakan',
            type: 'select',
            defaultValue: 'restock',
            options: [
                { value: 'restock', label: 'Penambahan stok' },
                { value: 'adjustment', label: 'Koreksi stok' },
            ],
            required: true,
        },
        {
            name: 'quantity',
            label: 'Perubahan kuantitas',
            type: 'number',
            step: 1,
            required: true,
            description:
                'Gunakan nilai negatif hanya untuk koreksi pengurangan stok.',
        },
        {
            name: 'reason',
            label: 'Alasan',
            type: 'textarea',
            required: true,
            wide: true,
        },
    ];

    return (
        <SectionShell
            id="produk"
            icon={Boxes}
            title="Produk & stok"
            description="Katalog poin dipisahkan dari ledger inventaris agar setiap perubahan stok memiliki alasan dan jejak audit."
            count={categories.length + products.length}
            canManage={canManage}
            action={
                <div className="flex flex-wrap gap-2">
                    <EntityFormDialog
                        title="Tambah kategori produk"
                        description="Kategori membantu penyajian katalog marketplace."
                        triggerLabel="Kategori"
                        action="/admin/master-data/product-categories"
                        fields={categoryFields()}
                    />
                    <EntityFormDialog
                        title="Tambah produk"
                        description="Stok awal dicatat melalui pergerakan inventaris setelah produk dibuat."
                        triggerLabel="Produk"
                        action="/admin/master-data/products"
                        fields={productFields()}
                        disabled={categories.length === 0}
                    />
                </div>
            }
        >
            <div
                className="grid gap-4 xl:grid-cols-[.65fr_1.35fr]"
                data-reveal-group="up"
            >
                <div
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="border-b p-5">
                        <h3 className="font-semibold">Kategori produk</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {categories.length} kategori tersedia
                        </p>
                    </div>
                    {categories.length > 0 ? (
                        <div
                            className="divide-y"
                            data-reveal-group="up"
                            data-reveal-distance="xs"
                            data-reveal-step="40"
                        >
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex items-start justify-between gap-3 px-5 py-4"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {category.name}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {category.slug}
                                        </p>
                                    </div>
                                    {canManage && (
                                        <EntityFormDialog
                                            title={`Ubah kategori ${category.name}`}
                                            description="Produk yang terhubung tetap berada pada kategori ini."
                                            triggerLabel="Ubah"
                                            action={`/admin/master-data/product-categories/${category.id}`}
                                            method="patch"
                                            fields={categoryFields(category)}
                                            icon={Pencil}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-5">
                            <EmptyState
                                icon={Boxes}
                                title="Belum ada kategori"
                                description="Kategori produk belum tersedia."
                            />
                        </div>
                    )}
                </div>

                <div
                    className="grid gap-3 md:grid-cols-2"
                    data-reveal-group="up"
                >
                    {products.length > 0 ? (
                        products.map((product) => (
                            <article
                                key={product.id}
                                className="eco-card eco-card-interactive flex flex-col p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                        <PackageCheck
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <Badge
                                        variant={
                                            product.is_active
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {product.is_active
                                            ? 'Aktif'
                                            : 'Nonaktif'}
                                    </Badge>
                                </div>
                                <h3 className="mt-4 font-semibold">
                                    {product.name}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {product.category?.name ??
                                        `Kategori #${product.product_category_id ?? '—'}`}
                                    {product.program?.title
                                        ? ` · ${product.program.title}`
                                        : ''}
                                </p>
                                {product.description && (
                                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                        {product.description}
                                    </p>
                                )}
                                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-sm">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Harga
                                        </dt>
                                        <dd className="mt-0.5 font-bold">
                                            {formatPoints(product.point_price)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Stok
                                        </dt>
                                        <dd className="mt-0.5 font-bold tabular-nums">
                                            {formatNumber(product.stock, 0)}
                                        </dd>
                                    </div>
                                </dl>
                                {canManage && (
                                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                                        <EntityFormDialog
                                            title={`Catat stok ${product.name}`}
                                            description={`Stok tercatat saat ini ${formatNumber(product.stock, 0)}. Perubahan disimpan sebagai ledger inventaris.`}
                                            triggerLabel="Stok"
                                            action="/admin/master-data/inventory"
                                            fields={inventoryFields(product)}
                                            icon={Warehouse}
                                        />
                                        <EntityFormDialog
                                            title={`Ubah ${product.name}`}
                                            description="Form ini tidak mengubah stok; gunakan tindakan stok untuk inventaris."
                                            triggerLabel="Ubah"
                                            action={`/admin/master-data/products/${product.id}`}
                                            method="patch"
                                            fields={productFields(product)}
                                            icon={Pencil}
                                        />
                                    </div>
                                )}
                            </article>
                        ))
                    ) : (
                        <div className="md:col-span-2">
                            <EmptyState
                                icon={Boxes}
                                title="Produk belum tersedia"
                                description="Belum ada produk yang dapat ditampilkan pada katalog."
                            />
                        </div>
                    )}
                </div>
            </div>
        </SectionShell>
    );
}

function RedemptionSection({
    redemptions,
    canManage,
}: {
    redemptions: Redemption[];
    canManage: boolean;
}) {
    return (
        <SectionShell
            id="penukaran"
            icon={ReceiptText}
            title="Penukaran"
            description="Proses pemenuhan penukaran sesuai status. Pembatalan wajib memiliki alasan dan kunci idempotensi baru."
            count={redemptions.length}
            canManage={canManage}
        >
            {redemptions.length > 0 ? (
                <div
                    className="grid gap-4 lg:grid-cols-2"
                    data-reveal-group="up"
                >
                    {redemptions.map((redemption) => (
                        <article
                            key={redemption.id}
                            className="eco-card overflow-hidden"
                        >
                            <div className="flex items-start justify-between gap-3 border-b p-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold">
                                            {redemption.number}
                                        </h3>
                                        <Badge
                                            variant={statusVariant(
                                                redemption.status,
                                            )}
                                        >
                                            {labelStatus(redemption.status)}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {redemption.user?.name ??
                                            'Pengguna tidak tersedia'}{' '}
                                        ·{' '}
                                        {formatDate(
                                            redemption.created_at,
                                            true,
                                        )}
                                    </p>
                                </div>
                                <p className="shrink-0 font-bold text-primary">
                                    {formatPoints(redemption.total_points)}
                                </p>
                            </div>
                            <div
                                className="divide-y"
                                data-reveal-group="up"
                                data-reveal-distance="xs"
                                data-reveal-step="40"
                            >
                                {(redemption.items ?? []).length > 0 ? (
                                    redemption.items?.map((item, index) => (
                                        <div
                                            key={
                                                item.id ??
                                                `${item.product_id ?? 'item'}-${index}`
                                            }
                                            className="flex items-start justify-between gap-3 px-5 py-3 text-sm"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {item.product_name}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {formatNumber(
                                                        item.quantity,
                                                        0,
                                                    )}{' '}
                                                    ×{' '}
                                                    {formatPoints(
                                                        item.point_price,
                                                    )}
                                                </p>
                                            </div>
                                            <p className="font-semibold">
                                                {formatPoints(
                                                    item.subtotal_points,
                                                )}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="px-5 py-5 text-center text-sm text-muted-foreground">
                                        Detail item tidak tersedia.
                                    </p>
                                )}
                            </div>
                            {(redemption.notes || redemption.processed_at) && (
                                <div className="border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                                    {redemption.notes && (
                                        <p>{redemption.notes}</p>
                                    )}
                                    {redemption.processed_at && (
                                        <p className="mt-1">
                                            Diproses{' '}
                                            {formatDate(
                                                redemption.processed_at,
                                                true,
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}
                            {canManage &&
                                !['completed', 'cancelled'].includes(
                                    redemption.status,
                                ) && (
                                    <div className="border-t p-4">
                                        <RedemptionStatusDialog
                                            redemption={redemption}
                                        />
                                    </div>
                                )}
                        </article>
                    ))}
                </div>
            ) : (
                <LockedEmpty
                    icon={ReceiptText}
                    title="Belum ada penukaran"
                    description="Transaksi penukaran belum tersedia untuk cakupan akun ini."
                />
            )}
        </SectionShell>
    );
}

function RedemptionStatusDialog({ redemption }: { redemption: Redemption }) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(redemption.status);
    const [idempotencyKey, setIdempotencyKey] = useState('');

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setStatus(redemption.status);
            setIdempotencyKey(crypto.randomUUID());
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" size="sm">
                    <ChevronRight aria-hidden="true" />
                    Proses status
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Proses {redemption.number}</DialogTitle>
                    <DialogDescription>
                        Pilih status operasional berikutnya. Server tetap
                        memvalidasi transisi yang diizinkan.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/marketplace/redemptions/${redemption.id}/status`}
                    method="patch"
                    transform={(data) => ({
                        ...data,
                        ...(status === 'cancelled'
                            ? { idempotency_key: idempotencyKey }
                            : {}),
                    })}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label
                                    htmlFor={`redemption-status-${redemption.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Status baru
                                </label>
                                <select
                                    id={`redemption-status-${redemption.id}`}
                                    name="status"
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    required
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="pending">Menunggu</option>
                                    <option value="processing">Diproses</option>
                                    <option value="ready">
                                        Siap diserahkan
                                    </option>
                                    <option value="completed">Selesai</option>
                                    <option value="cancelled">
                                        Dibatalkan
                                    </option>
                                </select>
                                <InputError message={errors.status} />
                            </div>
                            {status === 'cancelled' && (
                                <div>
                                    <label
                                        htmlFor={`redemption-reason-${redemption.id}`}
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        Alasan pembatalan
                                    </label>
                                    <textarea
                                        id={`redemption-reason-${redemption.id}`}
                                        name="reason"
                                        rows={4}
                                        required
                                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    <InputError
                                        message={
                                            errors.reason ??
                                            errors.idempotency_key
                                        }
                                    />
                                </div>
                            )}
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing ? (
                                        <Spinner aria-hidden="true" />
                                    ) : (
                                        <Save aria-hidden="true" />
                                    )}
                                    {processing
                                        ? 'Memproses...'
                                        : 'Simpan status'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AuditSection({
    logs,
    canView,
}: {
    logs: AuditLog[];
    canView: boolean;
}) {
    return (
        <SectionShell
            id="audit"
            icon={ScrollText}
            title="Audit log"
            description="Jejak peristiwa bersifat read-only. Ringkasan hanya menampilkan identitas aktor, target, waktu, dan nama field yang berubah."
            count={canView ? logs.length : 0}
            canManage={canView}
        >
            {!canView ? (
                <LockedEmpty
                    icon={ShieldCheck}
                    title="Audit log dibatasi"
                    description="Akun ini tidak memiliki kewenangan untuk melihat jejak audit."
                />
            ) : logs.length > 0 ? (
                <div
                    className="eco-card overflow-hidden"
                    data-reveal="up"
                    data-reveal-distance="sm"
                >
                    <div className="eco-table-wrap">
                        <table className="w-full min-w-[780px] text-left text-sm">
                            <thead className="border-b bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Peristiwa
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Aktor
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Target
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Field berubah
                                    </th>
                                    <th
                                        className="px-5 py-3 font-semibold"
                                        scope="col"
                                    >
                                        Waktu
                                    </th>
                                </tr>
                            </thead>
                            <tbody
                                data-reveal-group="fade"
                                data-reveal-step="35"
                                className="divide-y [&>tr]:transition-colors [&>tr]:duration-200 [&>tr:hover]:bg-muted/40"
                            >
                                {logs.map((log) => {
                                    const changedFields = Array.from(
                                        new Set([
                                            ...Object.keys(log.before ?? {}),
                                            ...Object.keys(log.after ?? {}),
                                        ]),
                                    );

                                    return (
                                        <tr
                                            key={log.id}
                                            className="align-top hover:bg-muted/20"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold">
                                                    {log.event}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    #{log.id}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                {log.actor?.name ??
                                                    log.actor_name ??
                                                    'Sistem'}
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {log.auditable_type
                                                    ? log.auditable_type
                                                          .split('\\')
                                                          .at(-1)
                                                    : 'Tidak tersedia'}
                                                {log.auditable_id
                                                    ? ` #${log.auditable_id}`
                                                    : ''}
                                            </td>
                                            <td className="max-w-xs px-5 py-4">
                                                {changedFields.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {changedFields.map(
                                                            (field) => (
                                                                <Badge
                                                                    key={field}
                                                                    variant="outline"
                                                                >
                                                                    {field}
                                                                </Badge>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Tidak ada snapshot
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                                                {formatDate(
                                                    log.created_at,
                                                    true,
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <LockedEmpty
                    icon={ScrollText}
                    title="Audit log belum tersedia"
                    description="Belum ada peristiwa audit yang dapat ditampilkan."
                />
            )}
        </SectionShell>
    );
}

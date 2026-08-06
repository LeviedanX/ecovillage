import { Form, Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownUp,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Coins,
    Download,
    FileWarning,
    Filter,
    LockKeyhole,
    RotateCcw,
    Save,
    Search,
    Settings2,
    ShieldCheck,
    UserCog,
    UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageIntro } from '@/components/page-intro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type NamedOption = string | { name: string; label?: string };

type AdminUser = {
    id: number;
    name: string;
    email: string;
    role?: string | null;
    roles?: NamedOption[];
    primary_region?: string | null;
    region_name?: string | null;
    point_balance?: number | null;
    green_points?: number | null;
    created_at?: string | null;
};

type PointTransaction = {
    id: number;
    user_id?: number;
    user?: Pick<AdminUser, 'id' | 'name' | 'email'> | null;
    type: string;
    amount: number;
    balance_before?: number | null;
    balance_after?: number | null;
    reason?: string | null;
    actor_name?: string | null;
    actor?: { name: string } | null;
    occurred_at?: string | null;
    created_at?: string | null;
    reversible?: boolean;
    is_reversed?: boolean;
};

type ReportableContent = {
    id: number;
    type?: 'thread' | 'post' | string;
    title?: string | null;
    excerpt?: string | null;
    body?: string | null;
    status?: string | null;
    is_locked?: boolean;
};

type ContentReport = {
    id: number;
    reporter?: Pick<AdminUser, 'id' | 'name' | 'email'> | null;
    reporter_name?: string | null;
    reportable_type?: string | null;
    reportable_id?: number | null;
    content_type?: 'thread' | 'post' | string | null;
    reportable?: ReportableContent | null;
    content?: ReportableContent | null;
    reason: string;
    description?: string | null;
    status: string;
    created_at?: string | null;
};

type SiteSetting = {
    id: number;
    key: string;
    value: unknown;
    type?: string | null;
    group?: string | null;
    description?: string | null;
    is_public: boolean;
    updated_at?: string | null;
};

type Paginated<T> = {
    data: T[];
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    total?: number;
    prev_page_url?: string | null;
    next_page_url?: string | null;
};

type CollectionProp<T> = T[] | Paginated<T>;

type Filters = {
    q?: string;
    role?: string;
    report_status?: string;
    transaction_type?: string;
};

type Props = {
    users?: CollectionProp<AdminUser>;
    pointTransactions?: CollectionProp<PointTransaction>;
    reports?: CollectionProp<ContentReport>;
    siteSettings?: CollectionProp<SiteSetting>;
    roles?: NamedOption[];
    filters?: Filters;
};

const roleLabels: Record<string, string> = {
    warga: 'Warga',
    kader: 'Kader',
    pengelola: 'Pengelola',
    'super-admin': 'Super admin',
};

const transactionLabels: Record<string, string> = {
    earn: 'Perolehan',
    redeem: 'Penukaran',
    adjustment: 'Penyesuaian',
    reversal: 'Reversal',
    expired: 'Kedaluwarsa',
};

const reportStatusLabels: Record<string, string> = {
    pending: 'Menunggu tinjauan',
    reviewed: 'Ditinjau',
    resolved: 'Diselesaikan',
    dismissed: 'Ditolak',
};

function itemsOf<T>(collection?: CollectionProp<T>): T[] {
    if (!collection) {
        return [];
    }

    return Array.isArray(collection) ? collection : collection.data;
}

function totalOf<T>(collection?: CollectionProp<T>): number {
    if (!collection) {
        return 0;
    }

    return Array.isArray(collection)
        ? collection.length
        : (collection.total ?? collection.data.length);
}

function roleValue(role: NamedOption): string {
    return typeof role === 'string' ? role : role.name;
}

function roleLabel(role: NamedOption): string {
    if (typeof role !== 'string' && role.label) {
        return role.label;
    }

    const value = roleValue(role);

    return roleLabels[value] ?? value;
}

function currentRole(user: AdminUser): string {
    if (user.role) {
        return user.role;
    }

    const firstRole = user.roles?.[0];

    return firstRole ? roleValue(firstRole) : '';
}

function settingValue(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (value === null || value === undefined) {
        return '';
    }

    return JSON.stringify(value, null, 2);
}

function reportContent(report: ContentReport): ReportableContent | null {
    return report.reportable ?? report.content ?? null;
}

function reportContentType(report: ContentReport): 'thread' | 'post' | null {
    const declared = report.content_type ?? reportContent(report)?.type;
    const source =
        `${declared ?? ''} ${report.reportable_type ?? ''}`.toLowerCase();

    if (source.includes('thread')) {
        return 'thread';
    }

    if (source.includes('post')) {
        return 'post';
    }

    return null;
}

function reportStatusVariant(status: string) {
    if (status === 'pending') {
        return 'destructive' as const;
    }

    return status === 'resolved'
        ? ('default' as const)
        : ('secondary' as const);
}

export default function AdminOperations({
    users,
    pointTransactions,
    reports,
    siteSettings,
    roles = [],
    filters = {},
}: Props) {
    const userItems = itemsOf(users);
    const transactionItems = itemsOf(pointTransactions);
    const reportItems = itemsOf(reports);
    const settingItems = itemsOf(siteSettings);
    const pendingReportCount = reportItems.filter(
        (report) => report.status === 'pending',
    ).length;

    return (
        <>
            <Head title="Pusat Administrasi" />
            <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                <PageIntro
                    title="Pusat administrasi"
                    description="Kelola role, ledger poin, laporan forum, pengaturan situs, dan ekspor sesuai izin akun Anda. Setiap perubahan sensitif diproses dan diaudit oleh server."
                    action={
                        <Button asChild variant="outline">
                            <Link href="/dashboard">
                                <ShieldCheck aria-hidden="true" />
                                Kembali ke ringkasan
                            </Link>
                        </Button>
                    }
                />

                <section
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                    aria-label="Navigasi pusat administrasi"
                    data-reveal-group="scale"
                    data-reveal-distance="sm"
                    data-reveal-step="65"
                >
                    <SectionLink
                        href="#pengguna"
                        icon={UsersRound}
                        label="Pengguna"
                        value={totalOf(users)}
                    />
                    <SectionLink
                        href="#ledger"
                        icon={Coins}
                        label="Transaksi poin"
                        value={totalOf(pointTransactions)}
                    />
                    <SectionLink
                        href="#moderasi"
                        icon={FileWarning}
                        label="Laporan menunggu"
                        value={pendingReportCount}
                        attention={pendingReportCount > 0}
                    />
                    <SectionLink
                        href="#pengaturan"
                        icon={Settings2}
                        label="Pengaturan"
                        value={totalOf(siteSettings)}
                    />
                </section>

                <FilterPanel filters={filters} roles={roles} />
                <ExportPanel />

                <section id="pengguna" className="scroll-mt-6">
                    <SectionHeading
                        icon={UserCog}
                        title="Pengguna dan kewenangan"
                        description="Perubahan role menggantikan role aktif pengguna. Penyesuaian poin selalu masuk ke ledger, bukan mengubah saldo secara langsung."
                    />
                    <div
                        className="eco-card mt-4 overflow-hidden"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        {userItems.length > 0 ? (
                            <div className="eco-table-wrap">
                                <table className="w-full min-w-[850px] text-left text-sm">
                                    <thead className="border-b bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Pengguna
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Wilayah
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Role
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 text-right font-semibold"
                                            >
                                                Saldo poin
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 text-right font-semibold"
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
                                        {userItems.map((user) => (
                                            <UserRow
                                                key={user.id}
                                                user={user}
                                                roles={roles}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={UsersRound}
                                    title="Pengguna tidak ditemukan"
                                    description="Ubah filter pencarian atau pastikan akun Anda memiliki cakupan wilayah yang sesuai."
                                />
                            </div>
                        )}
                    </div>
                    <CollectionPagination collection={users} label="pengguna" />
                </section>

                <section id="ledger" className="scroll-mt-6">
                    <SectionHeading
                        icon={ArrowDownUp}
                        title="Ledger Green Points"
                        description="Riwayat berikut bersifat append-only. Koreksi transaksi dilakukan melalui reversal dengan alasan yang dapat diaudit."
                    />
                    <div
                        className="eco-card mt-4 overflow-hidden"
                        data-reveal="up"
                        data-reveal-distance="sm"
                    >
                        {transactionItems.length > 0 ? (
                            <div className="eco-table-wrap">
                                <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead className="border-b bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Transaksi
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Pengguna
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Alasan
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 text-right font-semibold"
                                            >
                                                Nilai
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 text-right font-semibold"
                                            >
                                                Saldo akhir
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 text-right font-semibold"
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
                                        {transactionItems.map((transaction) => (
                                            <TransactionRow
                                                key={transaction.id}
                                                transaction={transaction}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6">
                                <EmptyState
                                    icon={Coins}
                                    title="Transaksi tidak ditemukan"
                                    description="Ledger akan tampil ketika transaksi tersedia dalam cakupan akses Anda."
                                />
                            </div>
                        )}
                    </div>
                    <CollectionPagination
                        collection={pointTransactions}
                        label="transaksi poin"
                    />
                </section>

                <section id="moderasi" className="scroll-mt-6">
                    <SectionHeading
                        icon={FileWarning}
                        title="Laporan dan moderasi forum"
                        description="Tinjau konteks sebelum mengubah visibilitas konten atau menyelesaikan laporan. Alasan moderasi wajib dicatat."
                    />
                    {reportItems.length > 0 ? (
                        <div
                            className="mt-4 grid gap-4 lg:grid-cols-2"
                            data-reveal-group="up"
                        >
                            {reportItems.map((report) => (
                                <ReportCard key={report.id} report={report} />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="eco-card mt-4 p-5 sm:p-6"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <EmptyState
                                icon={CheckCircle2}
                                title="Tidak ada laporan pada filter ini"
                                description="Laporan forum yang masuk akan tersedia untuk ditinjau di sini."
                            />
                        </div>
                    )}
                    <CollectionPagination
                        collection={reports}
                        label="laporan"
                    />
                </section>

                <section id="pengaturan" className="scroll-mt-6">
                    <SectionHeading
                        icon={Settings2}
                        title="Pengaturan situs"
                        description="Nilai dikirim apa adanya ke server. Pastikan format JSON tetap valid untuk pengaturan terstruktur."
                    />
                    {settingItems.length > 0 ? (
                        <div
                            className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                            data-reveal-group="up"
                        >
                            {settingItems.map((setting) => (
                                <SettingCard
                                    key={setting.id}
                                    setting={setting}
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="eco-card mt-4 p-5 sm:p-6"
                            data-reveal="up"
                            data-reveal-distance="sm"
                        >
                            <EmptyState
                                icon={Settings2}
                                title="Pengaturan belum tersedia"
                                description="Tidak ada pengaturan yang dapat dikelola oleh akun ini."
                            />
                        </div>
                    )}
                    <CollectionPagination
                        collection={siteSettings}
                        label="pengaturan"
                    />
                </section>
            </div>
        </>
    );
}

function SectionLink({
    href,
    icon: Icon,
    label,
    value,
    attention = false,
}: {
    href: string;
    icon: typeof UsersRound;
    label: string;
    value: number;
    attention?: boolean;
}) {
    return (
        <a
            href={href}
            className="eco-card flex items-center gap-3 p-4 transition hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${attention ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
            >
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold">
                {label}
            </span>
            <strong className="text-lg tabular-nums">
                {formatNumber(value, 0)}
            </strong>
        </a>
    );
}

function FilterPanel({
    filters,
    roles,
}: {
    filters: Filters;
    roles: NamedOption[];
}) {
    return (
        <form
            action="/admin/operations"
            method="get"
            className="eco-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
            aria-label="Filter pusat administrasi"
        >
            <div>
                <label
                    htmlFor="admin-q"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                    Cari pengguna atau laporan
                </label>
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        id="admin-q"
                        name="q"
                        type="search"
                        defaultValue={filters.q}
                        placeholder="Nama, email, atau kata kunci"
                        className="pl-9"
                    />
                </div>
            </div>
            <FilterSelect
                id="admin-role"
                name="role"
                label="Role"
                defaultValue={filters.role}
            >
                <option value="">Semua role</option>
                {roles.map((role) => (
                    <option key={roleValue(role)} value={roleValue(role)}>
                        {roleLabel(role)}
                    </option>
                ))}
            </FilterSelect>
            <FilterSelect
                id="admin-report-status"
                name="report_status"
                label="Status laporan"
                defaultValue={filters.report_status}
            >
                <option value="">Semua status</option>
                {Object.entries(reportStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </FilterSelect>
            <FilterSelect
                id="admin-transaction-type"
                name="transaction_type"
                label="Jenis transaksi"
                defaultValue={filters.transaction_type}
            >
                <option value="">Semua jenis</option>
                {Object.entries(transactionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </FilterSelect>
            <div className="flex items-end gap-2">
                <Button type="submit">
                    <Filter aria-hidden="true" />
                    Terapkan
                </Button>
                <Button asChild type="button" variant="ghost" size="sm">
                    <Link href="/admin/operations">Reset</Link>
                </Button>
            </div>
        </form>
    );
}

function FilterSelect({
    id,
    name,
    label,
    defaultValue,
    children,
}: {
    id: string;
    name: string;
    label: string;
    defaultValue?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
                {label}
            </label>
            <select
                id={id}
                name={name}
                defaultValue={defaultValue ?? ''}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
                {children}
            </select>
        </div>
    );
}

function ExportPanel() {
    return (
        <details className="eco-card eco-card-interactive group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 marker:content-none sm:px-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Download className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                        Ekspor data pengumpulan
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                        Unduh CSV sesuai periode dan status dalam cakupan
                        wilayah Anda.
                    </span>
                </span>
                <ChevronRight
                    className="size-4 transition group-open:rotate-90"
                    aria-hidden="true"
                />
            </summary>
            <form
                action="/admin/exports/collections.csv"
                method="get"
                className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1.2fr_auto]"
            >
                <label className="text-xs font-medium text-muted-foreground">
                    Dari tanggal
                    <Input name="from" type="date" className="mt-1.5" />
                </label>
                <label className="text-xs font-medium text-muted-foreground">
                    Sampai tanggal
                    <Input name="to" type="date" className="mt-1.5" />
                </label>
                <FilterSelect
                    id="export-status"
                    name="status"
                    label="Status pengumpulan"
                >
                    <option value="">Semua status</option>
                    <option value="submitted">Diajukan</option>
                    <option value="assigned">Ditugaskan</option>
                    <option value="picked_up">Diambil</option>
                    <option value="weighed">Ditimbang</option>
                    <option value="verified">Terverifikasi</option>
                    <option value="completed">Selesai</option>
                    <option value="rejected">Ditolak</option>
                    <option value="cancelled">Dibatalkan</option>
                </FilterSelect>
                <Button type="submit" variant="outline" className="self-end">
                    <Download aria-hidden="true" />
                    Unduh CSV
                </Button>
            </form>
        </details>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof UsersRound;
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

function UserRow({ user, roles }: { user: AdminUser; roles: NamedOption[] }) {
    const role = currentRole(user);
    const balance = user.point_balance ?? user.green_points;

    return (
        <tr className="align-top hover:bg-muted/20">
            <td className="px-5 py-4">
                <p className="font-semibold">{user.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {user.email}
                </p>
                {user.created_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Bergabung {formatDate(user.created_at)}
                    </p>
                )}
            </td>
            <td className="px-5 py-4 text-muted-foreground">
                {user.primary_region ?? user.region_name ?? 'Belum ditentukan'}
            </td>
            <td className="px-5 py-4">
                {role ? (
                    <Badge variant="secondary">
                        {roleLabels[role] ?? role}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">
                        Belum ada role
                    </span>
                )}
            </td>
            <td className="px-5 py-4 text-right font-semibold tabular-nums">
                {typeof balance === 'number' ? formatPoints(balance) : '—'}
            </td>
            <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                    <RoleDialog user={user} roles={roles} />
                    <PointAdjustmentDialog user={user} />
                </div>
            </td>
        </tr>
    );
}

function RoleDialog({
    user,
    roles,
}: {
    user: AdminUser;
    roles: NamedOption[];
}) {
    const [open, setOpen] = useState(false);
    const role = currentRole(user);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={roles.length === 0}
                >
                    <UserCog aria-hidden="true" />
                    Role
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah role {user.name}</DialogTitle>
                    <DialogDescription>
                        Role baru menggantikan role aktif pengguna dan mengubah
                        kewenangannya. Perubahan ini dicatat dalam audit log.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/admin/users/${user.id}/role`}
                    method="patch"
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label
                                    htmlFor={`role-${user.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Role baru
                                </label>
                                <select
                                    id={`role-${user.id}`}
                                    name="role"
                                    defaultValue={role}
                                    required
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {!role && (
                                        <option value="">Pilih role</option>
                                    )}
                                    {roles.map((option) => (
                                        <option
                                            key={roleValue(option)}
                                            value={roleValue(option)}
                                        >
                                            {roleLabel(option)}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.role} />
                            </div>
                            {role === 'super-admin' && (
                                <p className="flex gap-2 rounded-xl bg-amber-950/60 p-3 text-xs leading-5 text-amber-100">
                                    <AlertTriangle
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    Super admin terakhir tidak dapat diturunkan
                                    oleh server.
                                </p>
                            )}
                            <DialogActions
                                processing={processing}
                                submitLabel="Simpan role"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function PointAdjustmentDialog({ user }: { user: AdminUser }) {
    const [open, setOpen] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState('');

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setIdempotencyKey(crypto.randomUUID());
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" size="sm">
                    <Coins aria-hidden="true" />
                    Poin
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sesuaikan poin {user.name}</DialogTitle>
                    <DialogDescription>
                        Gunakan nilai positif untuk menambah dan nilai negatif
                        untuk mengurangi. Saldo tidak boleh menjadi negatif.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/admin/users/${user.id}/points/adjust`}
                    method="post"
                    transform={(data) => ({
                        ...data,
                        idempotency_key: idempotencyKey,
                    })}
                    resetOnSuccess={['amount', 'reason']}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label
                                    htmlFor={`amount-${user.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Jumlah poin
                                </label>
                                <Input
                                    id={`amount-${user.id}`}
                                    name="amount"
                                    type="number"
                                    min="-1000000"
                                    max="1000000"
                                    step="1"
                                    placeholder="Contoh: 100 atau -50"
                                    required
                                />
                                <InputError
                                    message={errors.amount ?? errors.adjustment}
                                />
                            </div>
                            <ReasonField
                                id={`adjustment-reason-${user.id}`}
                                label="Alasan penyesuaian"
                                error={errors.reason}
                            />
                            <DialogActions
                                processing={processing}
                                submitLabel="Catat penyesuaian"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function TransactionRow({ transaction }: { transaction: PointTransaction }) {
    const date = transaction.occurred_at ?? transaction.created_at;
    const canReverse =
        transaction.reversible !== false &&
        transaction.is_reversed !== true &&
        transaction.type !== 'reversal';

    return (
        <tr className="align-top hover:bg-muted/20">
            <td className="px-5 py-4">
                <Badge variant="outline">
                    {transactionLabels[transaction.type] ?? transaction.type}
                </Badge>
                <p className="mt-1.5 text-xs text-muted-foreground">
                    #{transaction.id}
                    {date ? ` · ${formatDate(date, true)}` : ''}
                </p>
            </td>
            <td className="px-5 py-4">
                <p className="font-medium">
                    {transaction.user?.name ??
                        `Pengguna #${transaction.user_id ?? '—'}`}
                </p>
                {transaction.user?.email && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {transaction.user.email}
                    </p>
                )}
            </td>
            <td className="max-w-xs px-5 py-4 text-muted-foreground">
                <p className="line-clamp-2">
                    {transaction.reason || 'Tidak ada keterangan'}
                </p>
                {(transaction.actor_name ?? transaction.actor?.name) && (
                    <p className="mt-1 text-xs">
                        Oleh {transaction.actor_name ?? transaction.actor?.name}
                    </p>
                )}
            </td>
            <td
                className={`px-5 py-4 text-right font-bold tabular-nums ${transaction.amount < 0 ? 'text-destructive' : 'text-emerald-300'}`}
            >
                {transaction.amount > 0 ? '+' : ''}
                {formatPoints(transaction.amount)}
            </td>
            <td className="px-5 py-4 text-right font-semibold tabular-nums">
                {typeof transaction.balance_after === 'number'
                    ? formatPoints(transaction.balance_after)
                    : '—'}
            </td>
            <td className="px-5 py-4 text-right">
                {canReverse ? (
                    <ReverseDialog transaction={transaction} />
                ) : (
                    <span className="text-xs text-muted-foreground">
                        Tidak tersedia
                    </span>
                )}
            </td>
        </tr>
    );
}

function ReverseDialog({ transaction }: { transaction: PointTransaction }) {
    const [open, setOpen] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState('');

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setIdempotencyKey(crypto.randomUUID());
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                    <RotateCcw aria-hidden="true" />
                    Reversal
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Reversal transaksi #{transaction.id}
                    </DialogTitle>
                    <DialogDescription>
                        Sistem membuat transaksi lawan senilai{' '}
                        {formatPoints(Math.abs(transaction.amount))}. Transaksi
                        asli tidak dihapus.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/admin/point-transactions/${transaction.id}/reverse`}
                    method="post"
                    transform={(data) => ({
                        ...data,
                        idempotency_key: idempotencyKey,
                    })}
                    resetOnSuccess={['reason']}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <ReasonField
                                id={`reversal-reason-${transaction.id}`}
                                label="Alasan reversal"
                                error={errors.reason ?? errors.reversal}
                            />
                            <DialogActions
                                processing={processing}
                                submitLabel="Konfirmasi reversal"
                                destructive
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ReportCard({ report }: { report: ContentReport }) {
    const content = reportContent(report);
    const type = reportContentType(report);
    const contentId = content?.id ?? report.reportable_id;
    const contentSummary = content?.title ?? content?.excerpt ?? content?.body;

    return (
        <article className="eco-card flex flex-col overflow-hidden">
            <div className="flex items-start gap-3 border-b p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                    <FileWarning className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">Laporan #{report.id}</h3>
                        <Badge variant={reportStatusVariant(report.status)}>
                            {reportStatusLabels[report.status] ?? report.status}
                        </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {report.reporter?.name ??
                            report.reporter_name ??
                            'Pelapor tidak tersedia'}
                        {report.created_at
                            ? ` · ${formatDate(report.created_at, true)}`
                            : ''}
                    </p>
                </div>
            </div>
            <div className="flex-1 space-y-3 p-5 text-sm">
                <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Alasan laporan
                    </p>
                    <p className="mt-1 font-medium">{report.reason}</p>
                    {report.description && (
                        <p className="mt-1 leading-6 text-muted-foreground">
                            {report.description}
                        </p>
                    )}
                </div>
                {contentSummary && (
                    <blockquote className="line-clamp-3 rounded-xl border-l-4 border-primary/30 bg-muted/40 px-4 py-3 text-muted-foreground">
                        {contentSummary}
                    </blockquote>
                )}
            </div>
            <div className="flex flex-wrap gap-2 border-t bg-muted/20 p-4">
                {type && contentId && (
                    <ModerateDialog
                        report={report}
                        type={type}
                        contentId={contentId}
                    />
                )}
                {report.status !== 'resolved' &&
                    report.status !== 'dismissed' && (
                        <ResolveReportDialog report={report} />
                    )}
            </div>
        </article>
    );
}

function ModerateDialog({
    report,
    type,
    contentId,
}: {
    report: ContentReport;
    type: 'thread' | 'post';
    contentId: number;
}) {
    const [open, setOpen] = useState(false);
    const content = reportContent(report);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                    <LockKeyhole aria-hidden="true" />
                    Moderasi konten
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Moderasi {type === 'thread' ? 'topik' : 'balasan'} #
                        {contentId}
                    </DialogTitle>
                    <DialogDescription>
                        Atur visibilitas konten setelah meninjau laporan #
                        {report.id}. Tindakan ini tidak otomatis menyelesaikan
                        laporan.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action="/admin/forum/moderate"
                    method="patch"
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <input type="hidden" name="type" value={type} />
                            <input type="hidden" name="id" value={contentId} />
                            <div>
                                <label
                                    htmlFor={`moderation-status-${report.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Status konten
                                </label>
                                <select
                                    id={`moderation-status-${report.id}`}
                                    name="status"
                                    defaultValue={content?.status ?? 'hidden'}
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="visible">Terlihat</option>
                                    <option value="hidden">
                                        Disembunyikan
                                    </option>
                                    <option value="pending">
                                        Menunggu tinjauan
                                    </option>
                                </select>
                                <InputError message={errors.status} />
                            </div>
                            {type === 'thread' && (
                                <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                                    <input
                                        type="hidden"
                                        name="is_locked"
                                        value="0"
                                    />
                                    <Checkbox
                                        name="is_locked"
                                        value="1"
                                        defaultChecked={
                                            content?.is_locked ?? false
                                        }
                                        className="mt-0.5"
                                    />
                                    <span>
                                        <span className="block font-medium">
                                            Kunci topik
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                            Warga tidak dapat menambahkan
                                            balasan baru pada topik terkunci.
                                        </span>
                                    </span>
                                </label>
                            )}
                            <ReasonField
                                id={`moderation-reason-${report.id}`}
                                label="Alasan moderasi"
                                minLength={5}
                                error={errors.reason}
                            />
                            <InputError message={errors.id ?? errors.type} />
                            <DialogActions
                                processing={processing}
                                submitLabel="Terapkan moderasi"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ResolveReportDialog({ report }: { report: ContentReport }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" size="sm">
                    <ClipboardCheck aria-hidden="true" />
                    Selesaikan laporan
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Selesaikan laporan #{report.id}</DialogTitle>
                    <DialogDescription>
                        Pilih hasil tinjauan dan tulis catatan yang menjelaskan
                        keputusan moderator.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/admin/content-reports/${report.id}`}
                    method="patch"
                    resetOnSuccess={['resolution_notes']}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label
                                    htmlFor={`report-status-${report.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Hasil tinjauan
                                </label>
                                <select
                                    id={`report-status-${report.id}`}
                                    name="status"
                                    defaultValue="resolved"
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="resolved">
                                        Laporan terbukti / selesai
                                    </option>
                                    <option value="dismissed">
                                        Laporan tidak terbukti / ditolak
                                    </option>
                                </select>
                                <InputError message={errors.status} />
                            </div>
                            <div>
                                <label
                                    htmlFor={`resolution-notes-${report.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Catatan penyelesaian
                                </label>
                                <textarea
                                    id={`resolution-notes-${report.id}`}
                                    name="resolution_notes"
                                    minLength={10}
                                    maxLength={1000}
                                    rows={4}
                                    required
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.resolution_notes} />
                            </div>
                            <DialogActions
                                processing={processing}
                                submitLabel="Simpan hasil tinjauan"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function SettingCard({ setting }: { setting: SiteSetting }) {
    return (
        <article className="eco-card flex min-w-0 flex-col p-5">
            <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Settings2 className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-mono text-sm font-semibold break-all">
                        {setting.key}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {setting.group || 'general'} · {setting.type || 'nilai'}
                    </p>
                </div>
                <Badge variant={setting.is_public ? 'default' : 'outline'}>
                    {setting.is_public ? 'Publik' : 'Privat'}
                </Badge>
            </div>
            {setting.description && (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {setting.description}
                </p>
            )}
            <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-muted/50 p-3 text-xs leading-5 break-words whitespace-pre-wrap">
                {settingValue(setting.value) || 'Nilai kosong'}
            </pre>
            <div className="mt-auto pt-4">
                <SettingDialog setting={setting} />
            </div>
        </article>
    );
}

function SettingDialog({ setting }: { setting: SiteSetting }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                >
                    <Save aria-hidden="true" />
                    Ubah nilai
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah {setting.key}</DialogTitle>
                    <DialogDescription>
                        Periksa format nilai sebelum menyimpan. Perubahan
                        dicatat dengan identitas pengelola.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/admin/site-settings/${setting.id}`}
                    method="patch"
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label
                                    htmlFor={`setting-value-${setting.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Nilai
                                </label>
                                <textarea
                                    id={`setting-value-${setting.id}`}
                                    name="value"
                                    defaultValue={settingValue(setting.value)}
                                    rows={7}
                                    spellCheck={setting.type === 'string'}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.value} />
                            </div>
                            <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                                <input
                                    type="hidden"
                                    name="is_public"
                                    value="0"
                                />
                                <Checkbox
                                    name="is_public"
                                    value="1"
                                    defaultChecked={setting.is_public}
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="block font-medium">
                                        Dapat dibaca publik
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                        Aktifkan hanya untuk nilai yang aman
                                        diekspos ke halaman publik.
                                    </span>
                                </span>
                            </label>
                            <InputError message={errors.is_public} />
                            <DialogActions
                                processing={processing}
                                submitLabel="Simpan pengaturan"
                            />
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ReasonField({
    id,
    label,
    error,
    minLength = 10,
}: {
    id: string;
    label: string;
    error?: string;
    minLength?: number;
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
                {label}
            </label>
            <textarea
                id={id}
                name="reason"
                minLength={minLength}
                maxLength={1000}
                rows={4}
                required
                placeholder="Jelaskan dasar keputusan secara spesifik."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <InputError message={error} />
        </div>
    );
}

function DialogActions({
    processing,
    submitLabel,
    destructive = false,
}: {
    processing: boolean;
    submitLabel: string;
    destructive?: boolean;
}) {
    return (
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={processing}>
                    Batal
                </Button>
            </DialogClose>
            <Button
                type="submit"
                variant={destructive ? 'destructive' : 'default'}
                disabled={processing}
            >
                {processing ? (
                    <Spinner />
                ) : destructive ? (
                    <RotateCcw aria-hidden="true" />
                ) : (
                    <Save aria-hidden="true" />
                )}
                {processing ? 'Memproses…' : submitLabel}
            </Button>
        </DialogFooter>
    );
}

function CollectionPagination<T>({
    collection,
    label,
}: {
    collection?: CollectionProp<T>;
    label: string;
}) {
    if (!collection || Array.isArray(collection)) {
        return null;
    }

    const currentPage = collection.current_page ?? 1;
    const lastPage = collection.last_page ?? 1;

    if (lastPage <= 1) {
        return null;
    }

    return (
        <nav
            className="mt-4 flex flex-wrap items-center justify-between gap-3"
            aria-label={`Paginasi ${label}`}
        >
            <p className="text-sm text-muted-foreground">
                Halaman{' '}
                <strong className="text-foreground">{currentPage}</strong> dari{' '}
                {lastPage}
                {typeof collection.total === 'number' &&
                    ` · ${formatNumber(collection.total, 0)} ${label}`}
            </p>
            <div className="flex gap-2">
                {collection.prev_page_url ? (
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={collection.prev_page_url}
                            preserveScroll
                            preserveState
                        >
                            <ChevronLeft aria-hidden="true" />
                            Sebelumnya
                        </Link>
                    </Button>
                ) : (
                    <Button type="button" variant="outline" size="sm" disabled>
                        <ChevronLeft aria-hidden="true" />
                        Sebelumnya
                    </Button>
                )}
                {collection.next_page_url ? (
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={collection.next_page_url}
                            preserveScroll
                            preserveState
                        >
                            Berikutnya
                            <ChevronRight aria-hidden="true" />
                        </Link>
                    </Button>
                ) : (
                    <Button type="button" variant="outline" size="sm" disabled>
                        Berikutnya
                        <ChevronRight aria-hidden="true" />
                    </Button>
                )}
            </div>
        </nav>
    );
}

AdminOperations.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pusat administrasi', href: '/admin/operations' },
    ],
};

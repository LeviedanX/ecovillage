import { Form, Head } from '@inertiajs/react';
import { MapPin, ShieldCheck, UserCog } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';

type Assignment = {
    id: number;
    region: string | null;
    level: string | null;
    type: string;
    is_active: boolean;
};

type AccessUser = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    assignments: Assignment[];
};

type RoleRow = {
    id: number;
    name: string;
    locked: boolean;
    permissions: string[];
};

type RegionRow = { id: number; name: string; level: string; code: string };

type Props = {
    abilities: {
        manageUsers: boolean;
        manageRoles: boolean;
        manageRegionAssignments: boolean;
    };
    users: AccessUser[];
    roles: RoleRow[];
    permissions: string[];
    assignableRoles: string[];
    assignmentTypes: string[];
    regions: RegionRow[];
};

const roleLabels: Record<string, string> = {
    'super-admin': 'Super admin',
    pengelola: 'Pengelola',
    kader: 'Kader',
    warga: 'Warga',
};

const label = (value: string | null): string =>
    value === null ? 'Tanpa role' : (roleLabels[value] ?? value);

const selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function RoleDialog({
    user,
    assignableRoles,
}: {
    user: AccessUser;
    assignableRoles: string[];
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                    <UserCog aria-hidden="true" />
                    Role
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah role {user.name}</DialogTitle>
                    <DialogDescription>
                        Role menggantikan seluruh kewenangan pengguna. Super
                        admin bersifat tunggal: promosi ditolak selama masih ada
                        pemegang lain, dan pemegang terakhir tidak dapat
                        diturunkan.
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
                                    defaultValue={user.role ?? ''}
                                    required
                                    className={selectClass}
                                >
                                    {user.role === null && (
                                        <option value="">Pilih role</option>
                                    )}
                                    {assignableRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {label(role)}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.role} />
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Simpan role
                            </Button>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AssignmentDialog({
    user,
    regions,
    assignmentTypes,
}: {
    user: AccessUser;
    regions: RegionRow[];
    assignmentTypes: string[];
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                    <MapPin aria-hidden="true" />
                    Wilayah
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Penugasan wilayah {user.name}</DialogTitle>
                    <DialogDescription>
                        Penugasan menentukan data warga mana yang dapat dilihat
                        dan diproses. Jenis penugasan harus sama dengan role
                        aktif pengguna.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action={`/admin/users/${user.id}/region-assignments`}
                    method="post"
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <label
                                    htmlFor={`region-${user.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Wilayah
                                </label>
                                <select
                                    id={`region-${user.id}`}
                                    name="region_id"
                                    required
                                    className={selectClass}
                                >
                                    {regions.map((region) => (
                                        <option
                                            key={region.id}
                                            value={region.id}
                                        >
                                            {region.name} ({region.code})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.region_id} />
                            </div>
                            <div>
                                <label
                                    htmlFor={`type-${user.id}`}
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Jenis penugasan
                                </label>
                                <select
                                    id={`type-${user.id}`}
                                    name="assignment_type"
                                    defaultValue={user.role ?? ''}
                                    required
                                    className={selectClass}
                                >
                                    {assignmentTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {label(type)}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.assignment_type} />
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Tambah penugasan
                            </Button>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AssignmentRow({
    assignment,
    canManage,
}: {
    assignment: Assignment;
    canManage: boolean;
}) {
    return (
        <li className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">{assignment.region ?? '—'}</span>
            <Badge variant="outline">{label(assignment.type)}</Badge>
            <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                {assignment.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
            {canManage && (
                <Form
                    action={`/admin/region-assignments/${assignment.id}`}
                    method="patch"
                    className="ml-auto"
                >
                    {({ processing }) => (
                        <>
                            <input
                                type="hidden"
                                name="is_active"
                                value={assignment.is_active ? '0' : '1'}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                {assignment.is_active
                                    ? 'Nonaktifkan'
                                    : 'Aktifkan'}
                            </Button>
                        </>
                    )}
                </Form>
            )}
        </li>
    );
}

function RolePermissions({
    role,
    permissions,
}: {
    role: RoleRow;
    permissions: string[];
}) {
    if (role.locked) {
        return (
            <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                Permission super admin bersifat tetap dan tidak dapat diubah.
                Kewenangannya berasal dari gate global, bukan dari daftar
                permission.
            </p>
        );
    }

    return (
        <Form
            action={`/admin/roles/${role.id}/permissions`}
            method="patch"
            className="space-y-4"
        >
            {({ processing, errors }) => (
                <>
                    <fieldset>
                        <legend className="sr-only">
                            Permission untuk role {label(role.name)}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {permissions.map((permission) => (
                                <label
                                    key={permission}
                                    className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        name="permissions[]"
                                        value={permission}
                                        defaultChecked={role.permissions.includes(
                                            permission,
                                        )}
                                        className="size-4 rounded border-input"
                                    />
                                    <span className="min-w-0 break-all">
                                        {permission}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <InputError message={errors.permissions} />
                    <InputError message={errors.role} />
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        Simpan permission {label(role.name)}
                    </Button>
                </>
            )}
        </Form>
    );
}

export default function Access({
    abilities,
    users,
    roles,
    permissions,
    assignableRoles,
    assignmentTypes,
    regions,
}: Props) {
    return (
        <>
            <Head title="Manajemen akses" />
            <div className="eco-container eco-section-sm space-y-10">
                <PageIntro
                    title="Manajemen akses"
                    description="Atur role pengguna, penugasan wilayah petugas dan pengelola, serta permission tiap role. Setiap perubahan tercatat di audit log."
                />

                {abilities.manageUsers && (
                    <section className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <UserCog className="size-5" aria-hidden="true" />
                            Pengguna
                        </h2>

                        {users.length === 0 ? (
                            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                                Belum ada pengguna pada wilayah yang dapat Anda
                                kelola.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {users.map((user) => (
                                    <li
                                        key={user.id}
                                        className="rounded-xl border bg-card p-4"
                                    >
                                        <div className="flex flex-wrap items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium break-words">
                                                    {user.name}
                                                </p>
                                                <p className="text-sm break-all text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <Badge variant="outline">
                                                {label(user.role)}
                                            </Badge>
                                            <div className="flex flex-wrap gap-2">
                                                <RoleDialog
                                                    user={user}
                                                    assignableRoles={
                                                        assignableRoles
                                                    }
                                                />
                                                {abilities.manageRegionAssignments && (
                                                    <AssignmentDialog
                                                        user={user}
                                                        regions={regions}
                                                        assignmentTypes={
                                                            assignmentTypes
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {user.assignments.length > 0 && (
                                            <ul className="mt-3 space-y-2">
                                                {user.assignments.map(
                                                    (assignment) => (
                                                        <AssignmentRow
                                                            key={assignment.id}
                                                            assignment={
                                                                assignment
                                                            }
                                                            canManage={
                                                                abilities.manageRegionAssignments
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {abilities.manageRoles && (
                    <section className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <ShieldCheck
                                className="size-5"
                                aria-hidden="true"
                            />
                            Permission per role
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Mencabut permission berlaku bagi seluruh pemegang
                            role tersebut. Periksa dampaknya sebelum menyimpan.
                        </p>

                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className="space-y-3 rounded-xl border bg-card p-4"
                            >
                                <h3 className="font-medium">
                                    {label(role.name)}
                                </h3>
                                <RolePermissions
                                    role={role}
                                    permissions={permissions}
                                />
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </>
    );
}

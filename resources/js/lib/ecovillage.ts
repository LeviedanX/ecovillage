import type { CollectionStatus } from '@/types';

export const formatNumber = (value: number, maximumFractionDigits = 1) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);

export const formatDate = (value?: string | null, withTime = false) => {
    if (!value) {
        return 'Belum ditentukan';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
};

export const formatPoints = (value: number) => `${formatNumber(value, 0)} poin`;

export const publicAssetUrl = (path?: string | null) => {
    if (!path) {
        return null;
    }

    return path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('/')
        ? path
        : `/storage/${path}`;
};

export const namedValue = (
    value?: string | { name: string } | null,
    fallback = '',
) => (typeof value === 'string' ? value : value?.name || fallback);

export const collectionStatus: Record<
    CollectionStatus,
    {
        label: string;
        description: string;
        tone: 'green' | 'amber' | 'blue' | 'red' | 'gray';
    }
> = {
    submitted: {
        label: 'Diajukan',
        description: 'Permintaan sudah diterima dan menunggu penugasan.',
        tone: 'blue',
    },
    assigned: {
        label: 'Petugas ditugaskan',
        description: 'Petugas telah ditentukan untuk menangani permintaan.',
        tone: 'blue',
    },
    picked_up: {
        label: 'Sudah diambil',
        description: 'Sampah sudah diterima petugas dan menunggu penimbangan.',
        tone: 'amber',
    },
    weighed: {
        label: 'Sudah ditimbang',
        description: 'Hasil timbang menunggu verifikasi pengelola.',
        tone: 'amber',
    },
    verified: {
        label: 'Terverifikasi',
        description: 'Berat dan jenis sampah telah diverifikasi.',
        tone: 'green',
    },
    completed: {
        label: 'Selesai',
        description: 'Poin dan estimasi dampak telah dicatat.',
        tone: 'green',
    },
    rejected: {
        label: 'Ditolak',
        description:
            'Permintaan tidak dapat diproses. Lihat catatan pengelola.',
        tone: 'red',
    },
    cancelled: {
        label: 'Dibatalkan',
        description: 'Permintaan dibatalkan sebelum pengambilan.',
        tone: 'gray',
    },
};

export function userRoles(
    user?: { role?: string; roles?: Array<string | { name: string }> } | null,
) {
    const roles =
        user?.roles?.map((role) =>
            typeof role === 'string' ? role : role.name,
        ) ?? [];

    if (user?.role) {
        roles.push(user.role);
    }

    return roles.map((role) => role.toLowerCase().replaceAll('_', '-'));
}

// Nama role mengikuti App\Enums\RoleName. Alias di luar enum sengaja tidak
// diterima agar penambahan role baru gagal terlihat, bukan diam-diam lolos.
export function isManagerRole(roles: string[]) {
    return roles.some((role) => ['super-admin', 'pengelola'].includes(role));
}

export function isStaffRole(roles: string[]) {
    return roles.includes('kader');
}

export function isSuperAdminRole(roles: string[]) {
    return roles.includes('super-admin');
}

/**
 * Menu yang bergantung pada permission harus dibaca dari permission, bukan
 * dari role. Permission tiap role dapat diubah lewat panel manajemen akses,
 * sehingga menebak dari nama role akan salah begitu susunannya disesuaikan.
 */
export function hasAnyPermission(
    user: { permissions?: string[] } | null | undefined,
    wanted: string[],
) {
    const owned = user?.permissions ?? [];

    return wanted.some((permission) => owned.includes(permission));
}

// Diurutkan dari wewenang tertinggi supaya identitas yang ditampilkan pada
// sidebar selalu role paling menentukan, bukan yang kebetulan terdaftar duluan.
const roleLabels: Array<[string, string]> = [
    ['super-admin', 'Super admin'],
    ['pengelola', 'Pengelola wilayah'],
    ['kader', 'Kader lingkungan'],
    ['warga', 'Warga'],
];

export function primaryRoleLabel(roles: string[]) {
    return roleLabels.find(([role]) => roles.includes(role))?.[1] ?? 'Warga';
}

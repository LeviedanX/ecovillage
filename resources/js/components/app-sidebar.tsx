import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Boxes,
    CalendarHeart,
    ClipboardCheck,
    Coins,
    Database,
    History,
    LayoutDashboard,
    LayoutTemplate,
    Map,
    MessageSquareText,
    Recycle,
    Settings2,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import {
    isManagerRole,
    isStaffRole,
    isSuperAdminRole,
    userRoles,
} from '@/lib/ecovillage';
import { toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Ringkasan',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Setor / lapor sampah',
        href: '/pengumpulan/buat',
        icon: Recycle,
    },
    {
        title: 'Riwayat pengumpulan',
        href: '/pengumpulan',
        icon: History,
    },
    {
        title: 'Green Points',
        href: '/poin',
        icon: Coins,
    },
    {
        title: 'Estimasi dampak',
        href: '/dampak',
        icon: Sparkles,
    },
    {
        title: 'Kegiatan',
        href: '/kegiatan',
        icon: CalendarHeart,
    },
    {
        title: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingBag,
    },
    {
        title: 'Forum warga',
        href: '/forum',
        icon: MessageSquareText,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Materi edukasi',
        href: '/edukasi',
        icon: BookOpen,
    },
    {
        title: 'Peta publik',
        href: '/peta',
        icon: Map,
    },
];

const staffNavItems: NavItem[] = [
    {
        title: 'Tugas pengumpulan',
        href: '/operasional/pengumpulan',
        icon: ClipboardCheck,
    },
    { title: 'Peta operasional', href: '/operasional/peta', icon: Map },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Pusat administrasi',
        href: '/admin/operations',
        icon: Settings2,
    },
    {
        title: 'Master data & CMS',
        href: '/admin/master-data',
        icon: Database,
    },
    {
        title: 'Pengumpulan wilayah',
        href: '/operasional/pengumpulan',
        icon: ClipboardCheck,
    },
    { title: 'Peta operasional', href: '/operasional/peta', icon: Map },
    { title: 'Program & kegiatan', href: '/kegiatan', icon: CalendarHeart },
    { title: 'Produk & penukaran', href: '/marketplace', icon: Boxes },
    { title: 'Forum komunitas', href: '/forum', icon: ShieldCheck },
];

// Konten publik hanya boleh disentuh super admin, jadi menunya berdiri
// terpisah dari grup pengelolaan agar tidak terlihat oleh pengelola wilayah.
const superAdminNavItems: NavItem[] = [
    {
        title: 'Konten situs publik',
        href: '/admin/konten-situs',
        icon: LayoutTemplate,
    },
];

/**
 * Satu tujuan hanya boleh muncul satu kali. Tanpa ini pengelola melihat
 * `/kegiatan`, `/marketplace`, dan `/forum` dua kali, dan dua baris menyala
 * sebagai item aktif secara bersamaan.
 */
function withoutDuplicates(items: NavItem[], taken: Set<string>): NavItem[] {
    return items.filter((item) => {
        const href = toUrl(item.href);

        if (taken.has(href)) {
            return false;
        }

        taken.add(href);

        return true;
    });
}

export function AppSidebar() {
    const { auth } = usePage().props;
    const roles = userRoles(auth.user);
    const isStaff = isStaffRole(roles);
    const isManager = isManagerRole(roles);
    const isSuperAdmin = isSuperAdminRole(roles);

    const taken = new Set(mainNavItems.map((item) => toUrl(item.href)));
    const staffItems = isStaff ? withoutDuplicates(staffNavItems, taken) : [];
    const adminItems = isManager ? withoutDuplicates(adminNavItems, taken) : [];
    const superAdminItems = isSuperAdmin
        ? withoutDuplicates(superAdminNavItems, taken)
        : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="hover:bg-transparent active:bg-transparent"
                            asChild
                        >
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="opacity-60" />

            <SidebarContent className="gap-4 py-3">
                <NavMain items={mainNavItems} label="Ruang warga" />
                <NavMain items={staffItems} label="Operasional" />
                <NavMain items={adminItems} label="Pengelolaan" />
                <NavMain items={superAdminItems} label="Super admin" />
            </SidebarContent>

            <SidebarFooter className="gap-2 pt-0">
                <NavFooter items={footerNavItems} className="px-2" />
                <SidebarSeparator className="mx-0 opacity-60" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

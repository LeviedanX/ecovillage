import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeHelp,
    BookOpenCheck,
    CheckCircle2,
    CircleAlert,
    Leaf,
    Mail,
    Map,
    Recycle,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Sprout,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PublicHomeLink } from '@/components/public-home-link';
import { Button } from '@/components/ui/button';

type PageKey =
    | 'tentang'
    | 'masalah-solusi'
    | 'platform'
    | 'ecopore'
    | 'ecocycle'
    | 'faq'
    | 'kontak'
    | 'kebijakan-privasi';
type PageCopy = {
    eyebrow: string;
    title: string;
    lead: string;
    icon: LucideIcon;
    sections: Array<{ title: string; body: string; bullets?: string[] }>;
};

/**
 * Konten dikirim server dari tabel page_contents. Konstanta di bawah tetap
 * dipertahankan sebagai fallback agar halaman tidak kosong bila baris belum
 * tersedia (misalnya seeder konten belum dijalankan).
 */
type ServerContent = {
    eyebrow: string;
    title: string;
    lead: string;
    icon: string;
    sections: Array<{ title: string; body: string; bullets?: string[] }>;
    hero_image_url: string | null;
};

const iconMap: Record<string, LucideIcon> = {
    Leaf,
    Sprout,
    Recycle,
    ShieldCheck,
    Smartphone,
    BadgeHelp,
    CircleAlert,
    Mail,
    BookOpenCheck,
    Map,
    Users,
    Sparkles,
};

const pages: Record<PageKey, PageCopy> = {
    tentang: {
        eyebrow: 'Tentang Eco Village',
        title: 'Program lingkungan yang bertumpu pada pengetahuan dan gotong royong warga.',
        lead: 'Eco Village adalah program induk pemberdayaan lingkungan. EcoVillage.id menjadi platform digital untuk menghubungkan kontribusi warga, kerja kader, dan pengelolaan program secara dapat ditelusuri.',
        icon: Leaf,
        sections: [
            {
                title: 'Peran platform',
                body: 'Platform membantu mencatat proses yang sebelumnya tersebar: pengajuan pengumpulan, hasil timbang, kegiatan warga, poin, estimasi dampak, edukasi, dan forum komunitas.',
            },
            {
                title: 'Prinsip pengelolaan',
                body: 'Keputusan sensitif tetap berada pada petugas dan pengelola berwenang. Antarmuka warga tidak menggantikan verifikasi lapangan.',
                bullets: [
                    'Data pribadi diminimalkan dan lokasi rumah tidak dipublikasikan.',
                    'Poin berasal dari berat terverifikasi, bukan klaim warga.',
                    'Estimasi dampak selalu menyertakan faktor, versi, dan disclaimer.',
                ],
            },
            {
                title: 'Program yang saling melengkapi',
                body: 'EcoPore berfokus pada pengolahan organik berbasis biopori, sedangkan EcoCycle berfokus pada pengolahan anorganik menjadi produk bernilai.',
            },
        ],
    },
    'masalah-solusi': {
        eyebrow: 'Masalah dan solusi',
        title: 'Pengelolaan sampah memerlukan alur yang jelas, bukan hanya ajakan.',
        lead: 'Sampah tercampur, jadwal yang tidak pasti, dan data kontribusi yang terputus membuat upaya warga sulit dipertahankan. Eco Village meresponsnya melalui proses komunitas yang terukur.',
        icon: CircleAlert,
        sections: [
            {
                title: 'Masalah yang dihadapi',
                body: 'Warga sering tidak mengetahui bagaimana memilah, ke mana harus menyetor, kapan petugas datang, atau apa yang terjadi setelah sampah diterima.',
                bullets: [
                    'Informasi edukasi tersebar dan tidak selalu memiliki sumber.',
                    'Hasil timbang dan kontribusi sulit ditelusuri.',
                    'Data lokasi berisiko terbuka bila peta dirancang tanpa prinsip privasi.',
                ],
            },
            {
                title: 'Solusi operasional',
                body: 'EcoVillage.id menyediakan alur status eksplisit dari pengajuan sampai selesai, disertai histori perubahan dan batas kewenangan setiap role.',
            },
            {
                title: 'Solusi berbasis program',
                body: 'EcoPore dan EcoCycle menghubungkan edukasi dengan praktik. Marketplace terkelola kemudian memberi ruang bagi produk program tanpa menambah kompleksitas pembayaran dan multi-vendor.',
            },
        ],
    },
    platform: {
        eyebrow: 'Platform EcoVillage.id',
        title: 'Satu ruang digital untuk alur warga, petugas, dan pengelola.',
        lead: 'EcoVillage.id bukan sekadar katalog informasi. Platform ini mengelola permintaan, verifikasi, ledger poin, estimasi dampak, kegiatan, produk, dan forum sesuai role serta wilayah.',
        icon: Smartphone,
        sections: [
            {
                title: 'Untuk warga',
                body: 'Warga dapat mengelola alamat, mengajukan pengumpulan, memantau status, melihat poin dan dampak, mengikuti kegiatan, serta berpartisipasi dalam forum.',
            },
            {
                title: 'Untuk kader',
                body: 'Kader hanya melihat tugas dan titik lokasi yang memang menjadi kewenangannya, lalu mencatat proses pengambilan dan hasil timbang.',
            },
            {
                title: 'Untuk pengelola',
                body: 'Pengelola memverifikasi hasil, mengelola program dan katalog, memoderasi forum, serta membaca laporan wilayah tanpa mengubah histori transaksi.',
            },
        ],
    },
    ecopore: {
        eyebrow: 'Program EcoPore',
        title: 'Mengolah organik melalui pembelajaran dan pemantauan berbasis biopori.',
        lead: 'EcoPore adalah program pelatihan dan monitoring pengolahan sampah organik menjadi kompos berbasis biopori dalam kerangka Eco Village.',
        icon: Sprout,
        sections: [
            {
                title: 'Fokus kegiatan',
                body: 'Program dapat memuat sesi edukasi, praktik, pendampingan, kehadiran peserta, dokumentasi, dan catatan hasil kegiatan.',
            },
            {
                title: 'Keterhubungan dengan platform',
                body: 'Jadwal, kuota, lokasi, status pendaftaran, dan materi dikelola melalui EcoVillage.id agar peserta memiliki informasi yang konsisten.',
            },
            {
                title: 'Batas informasi',
                body: 'Materi yang dipublikasikan harus memiliki sumber yang dapat ditelusuri. Klaim teknis dan dampak tidak ditampilkan sebagai fakta ilmiah tanpa dasar.',
            },
        ],
    },
    ecocycle: {
        eyebrow: 'Program EcoCycle',
        title: 'Mendorong anorganik menjadi bahan dan produk yang kembali bernilai.',
        lead: 'EcoCycle adalah program pelatihan dan pengolahan sampah anorganik dalam kerangka Eco Village, dengan hasil yang dapat masuk ke katalog terkelola.',
        icon: Recycle,
        sections: [
            {
                title: 'Fokus kegiatan',
                body: 'Program menghubungkan pemilahan, pelatihan pengolahan, dokumentasi kegiatan, dan pencatatan hasil tanpa mengklaim seluruh material pasti dapat didaur ulang.',
            },
            {
                title: 'Produk program',
                body: 'Produk yang disetujui pengelola dapat ditampilkan di katalog dan ditukar dengan Green Points selama stok tersedia.',
            },
            {
                title: 'Proses yang transparan',
                body: 'Stok dan poin dikurangi bersamaan saat penukaran dikonfirmasi server untuk mencegah saldo atau persediaan tidak konsisten.',
            },
        ],
    },
    faq: {
        eyebrow: 'Pertanyaan umum',
        title: 'Jawaban singkat untuk memulai dengan aman.',
        lead: 'Informasi berikut menjelaskan batas layanan, data, poin, dan estimasi dampak EcoVillage.id.',
        icon: BadgeHelp,
        sections: [
            {
                title: 'Kapan Green Points diberikan?',
                body: 'Setelah sampah diambil atau disetorkan, ditimbang, dan hasilnya diverifikasi. Estimasi warga tidak digunakan sebagai dasar poin.',
            },
            {
                title: 'Apakah lokasi rumah terlihat di peta publik?',
                body: 'Tidak. Peta publik hanya menggunakan data selesai yang telah diagregasi dan memenuhi ambang privasi.',
            },
            {
                title: 'Apakah Estimasi Dampak merupakan LCA?',
                body: 'Bukan. Hasil dihitung dari berat terverifikasi dikali faktor berversi dan selalu disertai batas metodologi.',
            },
            {
                title: 'Bagaimana dengan sampah B3?',
                body: 'Sampah berbahaya mengikuti alur rujukan khusus dan tidak diproses sebagai pengambilan rumah tangga biasa tanpa mitra atau petugas berwenang.',
            },
            {
                title: 'Bisakah poin diedit langsung?',
                body: 'Tidak. Semua perubahan dilakukan melalui transaksi earn, redeem, adjustment, reversal, atau expired yang memiliki histori.',
            },
        ],
    },
    kontak: {
        eyebrow: 'Kontak',
        title: 'Hubungi pengelola melalui kanal yang tersedia untuk wilayah Anda.',
        lead: 'Untuk menjaga akurasi dan privasi, informasi pengelola wilayah ditampilkan setelah pengguna masuk dan memiliki wilayah yang sesuai.',
        icon: Mail,
        sections: [
            {
                title: 'Pertanyaan program',
                body: 'Buka detail kegiatan EcoPore atau EcoCycle untuk melihat jadwal, lokasi, dan penanggung jawab yang dipublikasikan.',
            },
            {
                title: 'Permintaan dan sampah berbahaya',
                body: 'Gunakan catatan permintaan atau kanal pengelola dalam akun. Jangan mengirim data alamat, foto, atau koordinat melalui halaman publik.',
            },
            {
                title: 'Akses akun',
                body: 'Jika Anda belum memiliki akun warga, daftar terlebih dahulu lalu lengkapi profil dan wilayah secara benar.',
            },
        ],
    },
    'kebijakan-privasi': {
        eyebrow: 'Kebijakan privasi',
        title: 'Data pribadi digunakan seperlunya untuk menjalankan layanan warga.',
        lead: 'EcoVillage.id memisahkan data operasional privat dari informasi publik. Halaman ini menjelaskan penggunaan alamat dan lokasi, agregasi peta, serta penanganan data ketika akun dihapus.',
        icon: ShieldCheck,
        sections: [
            {
                title: 'Alamat dan persetujuan lokasi',
                body: 'Alamat tersimpan digunakan untuk pengumpulan yang diajukan pengguna. Koordinat tepat bersifat opsional dan hanya disimpan setelah pengguna memberikan persetujuan lokasi. Pengguna dapat tidak membagikan koordinat atau mencabut persetujuan dengan memperbarui alamatnya.',
            },
            {
                title: 'Akses data operasional',
                body: 'Alamat rumah dan koordinat tepat tidak ditampilkan pada halaman publik. Akses internal dibatasi menurut peran, wilayah, dan kebutuhan penugasan. Pengguna tetap perlu menghindari menuliskan data pribadi yang tidak diperlukan pada forum atau kolom publik.',
            },
            {
                title: 'Peta publik berbentuk agregat',
                body: 'Peta dampak menggunakan hasil pengumpulan selesai yang telah dikelompokkan. Titik hanya ditampilkan setelah memenuhi ambang minimum data dan ketelitian koordinat dikurangi, sehingga bukan penanda alamat rumah atau lokasi pengumpulan individual.',
            },
            {
                title: 'Retensi dan penghapusan akun',
                body: 'Data dipertahankan selama masih diperlukan untuk operasional, keamanan, audit transaksi, atau kewajiban yang berlaku. Ketika akun dihapus, data identitas dianonimkan pada catatan yang tetap harus dipertahankan agar histori poin, verifikasi, dan audit tidak rusak. Tidak ada jangka waktu retensi khusus yang diklaim pada halaman ini sebelum kebijakan pengelola menetapkannya.',
            },
            {
                title: 'Pertanyaan privasi',
                body: 'Kanal kontak petugas privasi belum dicantumkan pada konfigurasi publik. Gunakan halaman Kontak untuk melihat kanal resmi yang tersedia; jangan mengirim alamat, koordinat, kredensial, atau dokumen sensitif melalui kanal publik.',
            },
        ],
    },
};

export default function PublicPage({
    page,
    content: served,
    siteSettings = {},
}: {
    page: PageKey;
    content?: ServerContent;
    siteSettings?: Record<string, string>;
}) {
    const fallback = pages[page] || pages.tentang;
    const content: PageCopy = served
        ? {
              eyebrow: served.eyebrow,
              title: served.title,
              lead: served.lead,
              icon: iconMap[served.icon] ?? fallback.icon,
              sections: served.sections,
          }
        : fallback;
    const Icon = content.icon;
    const heroImage = served?.hero_image_url ?? null;

    return (
        <>
            <Head title={content.eyebrow}>
                <meta name="description" content={content.lead} />
            </Head>
            <section className="relative isolate overflow-hidden">
                <div className="eco-container relative grid gap-8 py-16 lg:grid-cols-[1fr_280px] lg:items-center lg:py-24">
                    <div className="relative">
                        <PublicHomeLink className="mb-7" />
                        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                            {content.title}
                        </h1>
                        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                            {content.lead}
                        </p>
                    </div>
                    <div className="hidden aspect-square place-items-center overflow-hidden rounded-4xl border bg-card/75 shadow-xl lg:grid">
                        {heroImage ? (
                            <img
                                src={heroImage}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            <Icon
                                className="size-24 text-primary/70"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                </div>
            </section>
            <div className="eco-surface">
                <section className="eco-container eco-section max-w-5xl">
                    <div className="grid gap-5" data-reveal-group="up">
                        {content.sections.map((section, index) => (
                            <article
                                key={section.title}
                                className="eco-card p-6 sm:p-8"
                            >
                                <div className="flex gap-4">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <h2 className="text-xl font-semibold tracking-tight">
                                            {section.title}
                                        </h2>
                                        <p className="mt-3 leading-7 text-muted-foreground">
                                            {section.body}
                                        </p>
                                        {section.bullets && (
                                            <ul className="mt-5 space-y-3">
                                                {section.bullets.map(
                                                    (bullet) => (
                                                        <li
                                                            key={bullet}
                                                            className="flex gap-3 text-sm leading-6"
                                                        >
                                                            <CheckCircle2
                                                                className="mt-0.5 size-5 shrink-0 text-primary"
                                                                aria-hidden="true"
                                                            />
                                                            {bullet}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                    <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-[1.75rem] bg-primary p-7 text-primary-foreground sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-xl font-semibold">
                                {siteSettings.page_cta_title ||
                                    'Siap berkontribusi bersama?'}
                            </h2>
                            <p className="mt-1 text-sm text-primary-foreground/75">
                                {siteSettings.page_cta_subtitle ||
                                    'Buat akun atau jelajahi materi publik terlebih dahulu.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="secondary">
                                <Link href="/register">
                                    Daftar <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            >
                                <Link href="/edukasi">
                                    <BookOpenCheck aria-hidden="true" />
                                    Edukasi
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

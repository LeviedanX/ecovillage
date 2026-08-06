<?php

namespace Database\Seeders;

use App\Models\PageContent;
use App\Models\SiteSetting;
use App\Support\SiteContentCatalog;
use Illuminate\Database\Seeder;

/**
 * Menanam konten bawaan halaman publik. Bersifat idempotent dan sengaja
 * memakai firstOrCreate agar penyuntingan admin tidak tertimpa saat seeder
 * dijalankan ulang pada deployment berikutnya.
 */
class SiteContentSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = SiteContentCatalog::settings();

        foreach (SiteContentCatalog::defaults() as $key => $value) {
            SiteSetting::query()->firstOrCreate(
                ['key' => $key],
                [
                    'value' => ['id' => $value],
                    'type' => $catalog[$key]['type'] ?? SiteContentCatalog::TYPE_TEXT,
                    'group' => $catalog[$key]['group'] ?? 'general',
                    'is_public' => true,
                ],
            );
        }

        foreach (self::pages() as $slug => $page) {
            PageContent::query()->firstOrCreate(['slug' => $slug], $page);
        }
    }

    /** @return array<string, array<string, mixed>> */
    public static function pages(): array
    {
        return [
            'tentang' => [
                'eyebrow' => 'Tentang Eco Village',
                'title' => 'Program lingkungan yang bertumpu pada pengetahuan dan gotong royong warga.',
                'lead' => 'Eco Village adalah program induk pemberdayaan lingkungan. EcoVillage.id menjadi platform digital untuk menghubungkan kontribusi warga, kerja kader, dan pengelolaan program secara dapat ditelusuri.',
                'icon' => 'Leaf',
                'sections' => [
                    [
                        'title' => 'Peran platform',
                        'body' => 'Platform membantu mencatat proses yang sebelumnya tersebar: pengajuan pengumpulan, hasil timbang, kegiatan warga, poin, estimasi dampak, edukasi, dan forum komunitas.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Prinsip pengelolaan',
                        'body' => 'Keputusan sensitif tetap berada pada petugas dan pengelola berwenang. Antarmuka warga tidak menggantikan verifikasi lapangan.',
                        'bullets' => [
                            'Data pribadi diminimalkan dan lokasi rumah tidak dipublikasikan.',
                            'Poin berasal dari berat terverifikasi, bukan klaim warga.',
                            'Estimasi dampak selalu menyertakan faktor, versi, dan disclaimer.',
                        ],
                    ],
                    [
                        'title' => 'Program yang saling melengkapi',
                        'body' => 'EcoPore berfokus pada pengolahan organik berbasis biopori, sedangkan EcoCycle berfokus pada pengolahan anorganik menjadi produk bernilai.',
                        'bullets' => [],
                    ],
                ],
            ],
            'masalah-solusi' => [
                'eyebrow' => 'Masalah dan solusi',
                'title' => 'Pengelolaan sampah memerlukan alur yang jelas, bukan hanya ajakan.',
                'lead' => 'Sampah tercampur, jadwal yang tidak pasti, dan data kontribusi yang terputus membuat upaya warga sulit dipertahankan. Eco Village meresponsnya melalui proses komunitas yang terukur.',
                'icon' => 'CircleAlert',
                'sections' => [
                    [
                        'title' => 'Masalah yang dihadapi',
                        'body' => 'Warga sering tidak mengetahui bagaimana memilah, ke mana harus menyetor, kapan petugas datang, atau apa yang terjadi setelah sampah diterima.',
                        'bullets' => [
                            'Informasi edukasi tersebar dan tidak selalu memiliki sumber.',
                            'Hasil timbang dan kontribusi sulit ditelusuri.',
                            'Data lokasi berisiko terbuka bila peta dirancang tanpa prinsip privasi.',
                        ],
                    ],
                    [
                        'title' => 'Solusi operasional',
                        'body' => 'EcoVillage.id menyediakan alur status eksplisit dari pengajuan sampai selesai, disertai histori perubahan dan batas kewenangan setiap role.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Solusi berbasis program',
                        'body' => 'EcoPore dan EcoCycle menghubungkan edukasi dengan praktik. Marketplace terkelola kemudian memberi ruang bagi produk program tanpa menambah kompleksitas pembayaran dan multi-vendor.',
                        'bullets' => [],
                    ],
                ],
            ],
            'platform' => [
                'eyebrow' => 'Platform EcoVillage.id',
                'title' => 'Satu ruang digital untuk alur warga, petugas, dan pengelola.',
                'lead' => 'EcoVillage.id bukan sekadar katalog informasi. Platform ini mengelola permintaan, verifikasi, ledger poin, estimasi dampak, kegiatan, produk, dan forum sesuai role serta wilayah.',
                'icon' => 'Smartphone',
                'sections' => [
                    [
                        'title' => 'Untuk warga',
                        'body' => 'Warga dapat mengelola alamat, mengajukan pengumpulan, memantau status, melihat poin dan dampak, mengikuti kegiatan, serta berpartisipasi dalam forum.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Untuk kader',
                        'body' => 'Kader hanya melihat tugas dan titik lokasi yang memang menjadi kewenangannya, lalu mencatat proses pengambilan dan hasil timbang.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Untuk pengelola',
                        'body' => 'Pengelola memverifikasi hasil, mengelola program dan katalog, memoderasi forum, serta membaca laporan wilayah tanpa mengubah histori transaksi.',
                        'bullets' => [],
                    ],
                ],
            ],
            'ecopore' => [
                'eyebrow' => 'Program EcoPore',
                'title' => 'Mengolah organik melalui pembelajaran dan pemantauan berbasis biopori.',
                'lead' => 'EcoPore adalah program pelatihan dan monitoring pengolahan sampah organik menjadi kompos berbasis biopori dalam kerangka Eco Village.',
                'icon' => 'Sprout',
                'sections' => [
                    [
                        'title' => 'Fokus kegiatan',
                        'body' => 'Program dapat memuat sesi edukasi, praktik, pendampingan, kehadiran peserta, dokumentasi, dan catatan hasil kegiatan.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Keterhubungan dengan platform',
                        'body' => 'Jadwal, kuota, lokasi, status pendaftaran, dan materi dikelola melalui EcoVillage.id agar peserta memiliki informasi yang konsisten.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Batas informasi',
                        'body' => 'Materi yang dipublikasikan harus memiliki sumber yang dapat ditelusuri. Klaim teknis dan dampak tidak ditampilkan sebagai fakta ilmiah tanpa dasar.',
                        'bullets' => [],
                    ],
                ],
            ],
            'ecocycle' => [
                'eyebrow' => 'Program EcoCycle',
                'title' => 'Mendorong anorganik menjadi bahan dan produk yang kembali bernilai.',
                'lead' => 'EcoCycle adalah program pelatihan dan pengolahan sampah anorganik dalam kerangka Eco Village, dengan hasil yang dapat masuk ke katalog terkelola.',
                'icon' => 'Recycle',
                'sections' => [
                    [
                        'title' => 'Fokus kegiatan',
                        'body' => 'Program menghubungkan pemilahan, pelatihan pengolahan, dokumentasi kegiatan, dan pencatatan hasil tanpa mengklaim seluruh material pasti dapat didaur ulang.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Produk program',
                        'body' => 'Produk yang disetujui pengelola dapat ditampilkan di katalog dan ditukar dengan Green Points selama stok tersedia.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Proses yang transparan',
                        'body' => 'Stok dan poin dikurangi bersamaan saat penukaran dikonfirmasi server untuk mencegah saldo atau persediaan tidak konsisten.',
                        'bullets' => [],
                    ],
                ],
            ],
            'faq' => [
                'eyebrow' => 'Pertanyaan umum',
                'title' => 'Jawaban singkat untuk memulai dengan aman.',
                'lead' => 'Informasi berikut menjelaskan batas layanan, data, poin, dan estimasi dampak EcoVillage.id.',
                'icon' => 'BadgeHelp',
                'sections' => [
                    [
                        'title' => 'Kapan Green Points diberikan?',
                        'body' => 'Setelah sampah diambil atau disetorkan, ditimbang, dan hasilnya diverifikasi. Estimasi warga tidak digunakan sebagai dasar poin.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Apakah lokasi rumah terlihat di peta publik?',
                        'body' => 'Tidak. Peta publik hanya menggunakan data selesai yang telah diagregasi dan memenuhi ambang privasi.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Apakah Estimasi Dampak merupakan LCA?',
                        'body' => 'Bukan. Hasil dihitung dari berat terverifikasi dikali faktor berversi dan selalu disertai batas metodologi.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Bagaimana dengan sampah B3?',
                        'body' => 'Sampah berbahaya mengikuti alur rujukan khusus dan tidak diproses sebagai pengambilan rumah tangga biasa tanpa mitra atau petugas berwenang.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Bisakah poin diedit langsung?',
                        'body' => 'Tidak. Semua perubahan dilakukan melalui transaksi earn, redeem, adjustment, reversal, atau expired yang memiliki histori.',
                        'bullets' => [],
                    ],
                ],
            ],
            'kontak' => [
                'eyebrow' => 'Kontak',
                'title' => 'Hubungi pengelola melalui kanal yang tersedia untuk wilayah Anda.',
                'lead' => 'Untuk menjaga akurasi dan privasi, informasi pengelola wilayah ditampilkan setelah pengguna masuk dan memiliki wilayah yang sesuai.',
                'icon' => 'Mail',
                'sections' => [
                    [
                        'title' => 'Pertanyaan program',
                        'body' => 'Buka detail kegiatan EcoPore atau EcoCycle untuk melihat jadwal, lokasi, dan penanggung jawab yang dipublikasikan.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Permintaan dan sampah berbahaya',
                        'body' => 'Gunakan catatan permintaan atau kanal pengelola dalam akun. Jangan mengirim data alamat, foto, atau koordinat melalui halaman publik.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Akses akun',
                        'body' => 'Jika Anda belum memiliki akun warga, daftar terlebih dahulu lalu lengkapi profil dan wilayah secara benar.',
                        'bullets' => [],
                    ],
                ],
            ],
            'kebijakan-privasi' => [
                'eyebrow' => 'Kebijakan privasi',
                'title' => 'Data pribadi digunakan seperlunya untuk menjalankan layanan warga.',
                'lead' => 'EcoVillage.id memisahkan data operasional privat dari informasi publik. Halaman ini menjelaskan penggunaan alamat dan lokasi, agregasi peta, serta penanganan data ketika akun dihapus.',
                'icon' => 'ShieldCheck',
                'sections' => [
                    [
                        'title' => 'Alamat dan persetujuan lokasi',
                        'body' => 'Alamat tersimpan digunakan untuk pengumpulan yang diajukan pengguna. Koordinat tepat bersifat opsional dan hanya disimpan setelah pengguna memberikan persetujuan lokasi. Pengguna dapat tidak membagikan koordinat atau mencabut persetujuan dengan memperbarui alamatnya.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Akses data operasional',
                        'body' => 'Alamat rumah dan koordinat tepat tidak ditampilkan pada halaman publik. Akses internal dibatasi menurut peran, wilayah, dan kebutuhan penugasan. Pengguna tetap perlu menghindari menuliskan data pribadi yang tidak diperlukan pada forum atau kolom publik.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Peta publik berbentuk agregat',
                        'body' => 'Peta dampak menggunakan hasil pengumpulan selesai yang telah dikelompokkan. Titik hanya ditampilkan setelah memenuhi ambang minimum data dan ketelitian koordinat dikurangi, sehingga bukan penanda alamat rumah atau lokasi pengumpulan individual.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Retensi dan penghapusan akun',
                        'body' => 'Data dipertahankan selama masih diperlukan untuk operasional, keamanan, audit transaksi, atau kewajiban yang berlaku. Ketika akun dihapus, data identitas dianonimkan pada catatan yang tetap harus dipertahankan agar histori poin, verifikasi, dan audit tidak rusak. Tidak ada jangka waktu retensi khusus yang diklaim pada halaman ini sebelum kebijakan pengelola menetapkannya.',
                        'bullets' => [],
                    ],
                    [
                        'title' => 'Pertanyaan privasi',
                        'body' => 'Kanal kontak petugas privasi belum dicantumkan pada konfigurasi publik. Gunakan halaman Kontak untuk melihat kanal resmi yang tersedia; jangan mengirim alamat, koordinat, kredensial, atau dokumen sensitif melalui kanal publik.',
                        'bullets' => [],
                    ],
                ],
            ],
        ];
    }
}

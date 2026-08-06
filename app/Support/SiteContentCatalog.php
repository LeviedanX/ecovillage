<?php

namespace App\Support;

/**
 * Katalog elemen halaman publik yang boleh diedit dari panel admin.
 *
 * Menjadi source of truth tunggal untuk seeder, validasi controller, dan
 * render form. Key di luar katalog ini ditolak agar admin tidak dapat
 * menyuntikkan setting liar yang tidak pernah dibaca halaman publik.
 */
final class SiteContentCatalog
{
    public const TYPE_TEXT = 'text';

    public const TYPE_TEXTAREA = 'textarea';

    public const TYPE_IMAGE = 'image';

    public const TYPE_COLOR = 'color';

    public const TYPE_LINK = 'link';

    /**
     * Direktori aset bawaan yang dikirim bersama repositori (bukan hasil
     * unggahan). Berkas di sini boleh dirujuk setting gambar tanpa perlu
     * masuk pustaka media, karena sudah berada di document root.
     */
    public const BUNDLED_DIRECTORY = 'background';

    /** Ikon lucide yang tersedia untuk header halaman statis. */
    public const ICONS = [
        'Leaf', 'Sprout', 'Recycle', 'ShieldCheck', 'Smartphone',
        'BadgeHelp', 'CircleAlert', 'Mail', 'BookOpenCheck', 'Map',
        'Users', 'Sparkles',
    ];

    /**
     * @return array<string, array{label: string, group: string, type: string, help?: string}>
     */
    public static function settings(): array
    {
        return [
            'site_brand_name' => [
                'label' => 'Nama brand',
                'group' => 'brand',
                'type' => self::TYPE_TEXT,
                'help' => 'Tampil pada judul tab dan header publik.',
            ],
            'site_footer_note' => [
                'label' => 'Catatan footer',
                'group' => 'brand',
                'type' => self::TYPE_TEXTAREA,
            ],

            'landing_hero_lead' => [
                'label' => 'Judul hero (baris awal)',
                'group' => 'landing',
                'type' => self::TYPE_TEXT,
            ],
            'landing_hero_highlight' => [
                'label' => 'Judul hero (bagian berwarna)',
                'group' => 'landing',
                'type' => self::TYPE_TEXT,
            ],
            'landing_hero_suffix' => [
                'label' => 'Judul hero (penutup)',
                'group' => 'landing',
                'type' => self::TYPE_TEXT,
            ],
            'landing_hero_subtitle' => [
                'label' => 'Subjudul hero',
                'group' => 'landing',
                'type' => self::TYPE_TEXTAREA,
            ],
            'landing_hero_primary_cta_label' => [
                'label' => 'Tombol utama — teks',
                'group' => 'landing',
                'type' => self::TYPE_TEXT,
            ],
            'landing_hero_primary_cta_href' => [
                'label' => 'Tombol utama — tautan',
                'group' => 'landing',
                'type' => self::TYPE_LINK,
                'help' => 'Gunakan path internal seperti /register.',
            ],
            'landing_hero_secondary_cta_label' => [
                'label' => 'Tombol kedua — teks',
                'group' => 'landing',
                'type' => self::TYPE_TEXT,
            ],
            'landing_hero_secondary_cta_href' => [
                'label' => 'Tombol kedua — tautan',
                'group' => 'landing',
                'type' => self::TYPE_LINK,
            ],
            'landing_hero_image' => [
                'label' => 'Ilustrasi hero',
                'group' => 'landing',
                'type' => self::TYPE_IMAGE,
                'help' => 'Kosongkan untuk menampilkan teks hero selebar container, tanpa gambar pendamping.',
            ],
            'landing_hero_background_image' => [
                'label' => 'Background hero',
                'group' => 'landing',
                'type' => self::TYPE_IMAGE,
                'help' => 'Ditumpuk di belakang teks tanpa overlay warna. Kosongkan untuk memakai background publik.',
            ],
            'landing_hero_accent_color' => [
                'label' => 'Warna aksen hero',
                'group' => 'landing',
                'type' => self::TYPE_COLOR,
            ],

            'public_background_desktop' => [
                'label' => 'Background situs — desktop',
                'group' => 'background',
                'type' => self::TYPE_IMAGE,
                'help' => 'Dipakai pada layar lebar (≥ 768px). Gambar di-cover penuh viewport.',
            ],
            'public_background_mobile' => [
                'label' => 'Background situs — mobile',
                'group' => 'background',
                'type' => self::TYPE_IMAGE,
                'help' => 'Dipakai pada layar sempit (< 768px), biasanya berorientasi potret.',
            ],
            'public_background_opacity' => [
                'label' => 'Kepekatan background (%)',
                'group' => 'background',
                'type' => self::TYPE_TEXT,
                'help' => 'Angka 0–100. Semakin kecil, teks semakin mudah dibaca.',
            ],

            'page_cta_title' => [
                'label' => 'Judul ajakan (halaman statis)',
                'group' => 'pages',
                'type' => self::TYPE_TEXT,
            ],
            'page_cta_subtitle' => [
                'label' => 'Subjudul ajakan',
                'group' => 'pages',
                'type' => self::TYPE_TEXTAREA,
            ],

            'impact_disclaimer' => [
                'label' => 'Disclaimer estimasi dampak',
                'group' => 'impact',
                'type' => self::TYPE_TEXTAREA,
            ],
        ];
    }

    /** @return array<int, string> */
    public static function keys(): array
    {
        return array_keys(self::settings());
    }

    /**
     * Daftar aset bawaan sebagai path absolut publik, contoh
     * `/background/bgd.png`. Dipindai dari filesystem agar berkas yang
     * ditambahkan ke repositori langsung tersedia di panel admin.
     *
     * @return array<int, string>
     */
    public static function bundledAssets(): array
    {
        $directory = public_path(self::BUNDLED_DIRECTORY);

        if (! is_dir($directory)) {
            return [];
        }

        $files = glob($directory.DIRECTORY_SEPARATOR.'*.{png,jpg,jpeg,webp,avif}', GLOB_BRACE) ?: [];
        sort($files);

        return array_map(
            static fn (string $file): string => '/'.self::BUNDLED_DIRECTORY.'/'.basename($file),
            $files,
        );
    }

    public static function isBundledAsset(string $value): bool
    {
        return in_array($value, self::bundledAssets(), true);
    }

    /**
     * Nilai bawaan; dipakai seeder dan sebagai fallback saat baris terhapus.
     *
     * @return array<string, string>
     */
    public static function defaults(): array
    {
        return [
            'site_brand_name' => 'EcoVillage.id',
            'site_footer_note' => 'Halaman publik tidak memuat alamat rumah, nomor telepon pribadi, atau koordinat tepat warga.',

            'landing_hero_lead' => 'Aksi lingkungan warga,',
            'landing_hero_highlight' => 'tercatat dan bertumbuh',
            'landing_hero_suffix' => 'bersama.',
            'landing_hero_subtitle' => 'Kelola pengumpulan sampah, pantau Green Points, ikuti EcoPore dan EcoCycle, serta pahami estimasi dampak dalam satu platform komunitas.',
            'landing_hero_primary_cta_label' => 'Mulai berkontribusi',
            'landing_hero_primary_cta_href' => '/register',
            'landing_hero_secondary_cta_label' => 'Pelajari cara kerja',
            'landing_hero_secondary_cta_href' => '/tentang',
            'landing_hero_image' => '',
            'landing_hero_background_image' => '',
            'landing_hero_accent_color' => '#10b981',

            'public_background_desktop' => '/'.self::BUNDLED_DIRECTORY.'/bgd.png',
            'public_background_mobile' => '/'.self::BUNDLED_DIRECTORY.'/bgp.png',
            'public_background_opacity' => '40',

            'page_cta_title' => 'Siap berkontribusi bersama?',
            'page_cta_subtitle' => 'Buat akun atau jelajahi materi publik terlebih dahulu.',

            'impact_disclaimer' => 'Estimasi dampak bukan LCA penuh dan tidak untuk klaim ilmiah.',
        ];
    }
}

<?php

return [
    /*
     * Daftar CIDR reverse proxy/load balancer yang boleh dipercaya untuk
     * header `X-Forwarded-*`, dipisahkan koma. Gunakan `*` hanya bila PHP-FPM
     * tidak dapat dijangkau langsung dari internet. Kosong = tanpa proxy.
     */
    'trusted_proxies' => env('TRUSTED_PROXIES', ''),

    'auth' => [
        /*
         * Verifikasi email menahan pengguna baru sampai ia membuka tautan yang
         * dikirim lewat email. Itu benar untuk deployment yang punya mailer,
         * tetapi menjadi jalan buntu bila belum ada. Matikan flag ini untuk
         * membuka alur pokok tanpa email; akun baru langsung ditandai
         * terverifikasi dan middleware `verified` berhenti memblokir.
         */
        'email_verification_required' => filter_var(
            env('REQUIRE_EMAIL_VERIFICATION', true),
            FILTER_VALIDATE_BOOL,
        ),

        /*
         * Registrasi menjawab email yang sudah terdaftar dengan hasil yang
         * sama seperti pendaftaran baru, lalu memberi tahu pemilik akun.
         * Tanpa ini, halaman daftar dapat dipakai memetakan akun warga.
         */
        'neutral_registration_response' => filter_var(
            env('NEUTRAL_REGISTRATION_RESPONSE', true),
            FILTER_VALIDATE_BOOL,
        ),
    ],

    'csp' => [
        'enabled' => filter_var(env('CSP_ENABLED', true), FILTER_VALIDATE_BOOL),

        /*
         * Kirim sebagai `Content-Security-Policy-Report-Only` ketika sedang
         * menguji perubahan kebijakan pada traffic nyata: pelanggaran tercatat
         * di console peramban tanpa memblokir apa pun.
         */
        'report_only' => filter_var(env('CSP_REPORT_ONLY', false), FILTER_VALIDATE_BOOL),
    ],

    'map' => [
        'style_url' => env('VITE_MAP_STYLE_URL') ?: 'https://demotiles.maplibre.org/style.json',

        /*
         * Origin tambahan yang melayani tile atau sprite bila berbeda dari host
         * style, dipisahkan koma. Nilainya masuk ke `img-src` dan `connect-src`
         * pada CSP; peta akan kosong bila origin tile tidak terdaftar.
         */
        'tile_origins' => env('MAP_TILE_ORIGINS', ''),
        'public_minimum_records' => (int) env('PUBLIC_MAP_MINIMUM_RECORDS', 3),
        'public_coordinate_precision' => (int) env('PUBLIC_MAP_COORDINATE_PRECISION', 2),
    ],

    'uploads' => [
        'disk' => env('PRIVATE_UPLOAD_DISK', 'local'),
        'max_image_kilobytes' => (int) env('UPLOAD_MAX_IMAGE_KB', 5120),
    ],

    'hazardous_waste' => [
        'partner_configured' => (bool) env('HAZARDOUS_PARTNER_CONFIGURED', false),
        'contact_name' => env('HAZARDOUS_CONTACT_NAME', 'Pengelola Eco Village'),
        'contact_url' => env('HAZARDOUS_CONTACT_URL'),
    ],

    'demo_accounts_enabled' => env('DEMO_ACCOUNTS_ENABLED', false),
    'demo_password' => env('DEMO_USER_PASSWORD', 'password'),
];

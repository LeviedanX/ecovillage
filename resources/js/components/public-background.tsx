import { usePage } from '@inertiajs/react';

/**
 * Latar situs publik. Dipasang `fixed` di belakang seluruh konten sehingga
 * tetap diam saat halaman digulir, dan memakai <picture> agar berkas potret
 * dikirim ke ponsel — bukan memuat gambar desktop lalu memotongnya.
 */
export function PublicBackground() {
    const { publicBackground } = usePage().props;

    const desktop = publicBackground?.desktop ?? '';
    const mobile = publicBackground?.mobile ?? '';
    const opacity = Math.min(100, Math.max(0, publicBackground?.opacity ?? 0));

    if (!desktop && !mobile) {
        return null;
    }

    return (
        /*
         * z-0, bukan z negatif. `body` memakai warna latar opaque, dan latar
         * itu dilukis setelah elemen ber-z-index negatif — sehingga gambar
         * apa pun di lapisan negatif akan tertutup sepenuhnya.
         */
        <div
            className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
            aria-hidden="true"
        >
            <picture>
                {mobile && (
                    <source media="(max-width: 767px)" srcSet={mobile} />
                )}
                {desktop && (
                    <source media="(min-width: 768px)" srcSet={desktop} />
                )}
                <img
                    src={desktop || mobile}
                    alt=""
                    /*
                     * object-cover pada elemen seukuran viewport: gambar
                     * mengisi penuh tanpa distorsi pada rasio apa pun, dari
                     * ponsel sempit sampai monitor ultrawide.
                     */
                    className="size-full object-cover object-center"
                    loading="eager"
                    decoding="async"
                />
            </picture>
            {/*
             * Lapisan warna latar menahan kontras teks. Tanpa ini, keterbacaan
             * bergantung pada gambar yang kebetulan dipilih admin.
             */}
            <div
                className="absolute inset-0 bg-background"
                style={{ opacity: 1 - opacity / 100 }}
            />
        </div>
    );
}

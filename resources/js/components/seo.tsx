import { Head, usePage } from '@inertiajs/react';

type Props = {
    title: string;
    description: string;
    /** Path atau URL absolut gambar pratinjau; dipakai Open Graph dan Twitter. */
    image?: string | null;
    /** Halaman yang isinya berubah menurut query, misalnya hasil pencarian. */
    noindex?: boolean;
    /** Data terstruktur schema.org untuk halaman ini. */
    structuredData?: Record<string, unknown> | null;
};

/**
 * Metadata satu halaman untuk mesin pencari dan pratinjau tautan.
 *
 * Tag ini hanya bermanfaat bila HTML awal sudah membawanya, karena crawler
 * non-Google dan pratinjau tautan WhatsApp maupun Facebook tidak menjalankan
 * JavaScript. Itulah sebabnya render sisi server pada `resources/js/ssr.tsx`
 * merupakan prasyarat, bukan pelengkap.
 */
export function Seo({
    title,
    description,
    image = null,
    noindex = false,
    structuredData = null,
}: Props) {
    const page = usePage();
    const origin = ((page.props.appUrl as string | undefined) ?? '').replace(
        /\/+$/,
        '',
    );

    /*
     * Canonical, og:url, og:type, og:site_name, dan og:locale dirender layout
     * Blade karena seluruhnya dapat diturunkan server dan harus tetap ada meski
     * proses SSR sedang mati. Yang tersisa di sini adalah metadata yang
     * bergantung pada isi halaman.
     */
    const absoluteImage = image
        ? image.startsWith('http')
            ? image
            : `${origin}${image.startsWith('/') ? '' : '/'}${image}`
        : `${origin}/icon/logo.png`;

    return (
        <Head title={title}>
            <meta
                name="description"
                content={description}
                head-key="description"
            />
            {noindex && (
                <meta
                    name="robots"
                    content="noindex, follow"
                    head-key="robots"
                />
            )}

            <meta property="og:title" content={title} head-key="og:title" />
            <meta
                property="og:description"
                content={description}
                head-key="og:description"
            />
            <meta
                property="og:image"
                content={absoluteImage}
                head-key="og:image"
            />

            <meta
                name="twitter:card"
                content="summary_large_image"
                head-key="twitter:card"
            />
            <meta
                name="twitter:title"
                content={title}
                head-key="twitter:title"
            />
            <meta
                name="twitter:description"
                content={description}
                head-key="twitter:description"
            />
            <meta
                name="twitter:image"
                content={absoluteImage}
                head-key="twitter:image"
            />

            {structuredData && (
                <script
                    type="application/ld+json"
                    head-key="structured-data"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(structuredData),
                    }}
                />
            )}
        </Head>
    );
}

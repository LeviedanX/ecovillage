import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowUpRight,
    BookOpen,
    Clock3,
    UserRound,
} from 'lucide-react';
import { Seo } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { formatDate, namedValue, publicAssetUrl } from '@/lib/ecovillage';
import type { EducationContent } from '@/types';

export default function ContentDetail({
    content,
    related = [],
}: {
    content: EducationContent;
    related?: EducationContent[];
}) {
    const cover = publicAssetUrl(content.cover_url || content.cover_path);
    const sourceUrl = content.source_url || content.external_url;

    return (
        <>
            <Seo
                title={content.title}
                description={
                    content.excerpt ||
                    `Materi edukasi pengelolaan sampah dari Eco Village: ${content.title}.`
                }
                image={cover}
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: content.title,
                    description: content.excerpt ?? undefined,
                    datePublished: content.published_at ?? undefined,
                    author: content.author
                        ? { '@type': 'Person', name: content.author }
                        : undefined,
                    publisher: {
                        '@type': 'Organization',
                        name: 'Eco Village',
                    },
                }}
            />
            <article>
                <header className="relative isolate overflow-hidden">
                    <div
                        className="eco-container eco-section-sm relative max-w-5xl"
                        data-reveal-group="up"
                        data-reveal-step="80"
                    >
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="-ml-3"
                        >
                            <Link href="/edukasi">
                                <ArrowLeft aria-hidden="true" /> Kembali ke
                                edukasi
                            </Link>
                        </Button>
                        <p className="eco-label mt-7">
                            {namedValue(content.category, 'Edukasi')}
                        </p>
                        <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                            {content.title}
                        </h1>
                        {content.excerpt && (
                            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                                {content.excerpt}
                            </p>
                        )}
                        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <UserRound
                                    className="size-4"
                                    aria-hidden="true"
                                />{' '}
                                {content.author_name ||
                                    content.author?.name ||
                                    'Tim Eco Village'}
                            </span>
                            <time
                                className="inline-flex items-center gap-1.5"
                                dateTime={content.published_at || undefined}
                            >
                                <Clock3 className="size-4" aria-hidden="true" />{' '}
                                {formatDate(content.published_at)}
                                {content.reading_time
                                    ? ` · ${content.reading_time} menit baca`
                                    : ''}
                            </time>
                        </div>
                    </div>
                </header>
                <div className="eco-surface">
                    <div className="eco-container eco-section-sm max-w-5xl">
                        {cover && (
                            <img
                                src={cover}
                                alt=""
                                className="mb-10 aspect-[16/8] w-full rounded-2xl border object-cover"
                            />
                        )}
                        {content.sanitized_html ? (
                            <div
                                className="prose prose-invert prose-emerald max-w-3xl"
                                dangerouslySetInnerHTML={{
                                    __html: content.sanitized_html,
                                }}
                            />
                        ) : (
                            <div className="max-w-3xl space-y-5 text-base leading-8 text-foreground/90">
                                {(content.body || content.excerpt || '')
                                    .split(/\n\n+/)
                                    .filter(Boolean)
                                    .map((paragraph, index) => (
                                        <p key={index}>{paragraph}</p>
                                    ))}
                            </div>
                        )}
                        {sourceUrl && (
                            <aside
                                className="mt-10 max-w-3xl rounded-2xl border bg-muted/40 p-5"
                                data-reveal="up"
                                data-reveal-distance="sm"
                            >
                                <p className="text-sm font-semibold">
                                    Sumber materi
                                </p>
                                <a
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-sm break-all text-primary hover:underline"
                                >
                                    Buka sumber asli{' '}
                                    <ArrowUpRight
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                </a>
                            </aside>
                        )}
                    </div>
                </div>
            </article>
            {related.length > 0 && (
                <section className="eco-surface">
                    <div className="eco-container max-w-5xl py-12">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Materi terkait
                        </h2>
                        <div
                            className="mt-6 grid gap-4 md:grid-cols-3"
                            data-reveal-group="up"
                        >
                            {related.slice(0, 3).map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/edukasi/${item.slug}`}
                                    className="rounded-2xl border bg-card p-5 hover:border-primary/40"
                                >
                                    <BookOpen
                                        className="size-5 text-primary"
                                        aria-hidden="true"
                                    />
                                    <p className="mt-3 leading-6 font-semibold">
                                        {item.title}
                                    </p>
                                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                        {item.excerpt}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

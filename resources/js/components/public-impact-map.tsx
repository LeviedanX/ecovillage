import { LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

export type AggregateMapPoint = {
    id?: number;
    latitude: number;
    longitude: number;
    weight_kg: number;
    category: string;
    region_name?: string;
    status?: string;
    scheduled_at?: string | null;
    request_count?: number;
};

export function PublicImpactMap({
    points,
    styleUrl,
    cluster = true,
    privacyMessage = 'Koordinat telah diagregasi; peta tidak menampilkan alamat rumah.',
}: {
    points: AggregateMapPoint[];
    styleUrl?: string;
    cluster?: boolean;
    privacyMessage?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        let disposed = false;
        let map: MapLibreMap | undefined;

        async function initializeMap() {
            try {
                const maplibregl = await import('maplibre-gl');

                if (disposed || !containerRef.current) {
                    return;
                }

                const center: [number, number] = points[0]
                    ? [points[0].longitude, points[0].latitude]
                    : [112.651, -7.98];

                map = new maplibregl.Map({
                    container: containerRef.current,
                    style:
                        styleUrl ||
                        import.meta.env.VITE_MAP_STYLE_URL ||
                        'https://demotiles.maplibre.org/style.json',
                    center,
                    zoom: points.length > 0 ? 12 : 10,
                    attributionControl: false,
                });
                map.addControl(
                    new maplibregl.NavigationControl({ showCompass: false }),
                    'top-right',
                );
                map.addControl(
                    new maplibregl.AttributionControl({ compact: true }),
                    'bottom-right',
                );

                map.on('load', () => {
                    if (!map) {
                        return;
                    }

                    map.addSource('aggregate-impact', {
                        type: 'geojson',
                        cluster,
                        clusterMaxZoom: 14,
                        clusterRadius: 48,
                        data: {
                            type: 'FeatureCollection',
                            features: points.map((point) => ({
                                type: 'Feature' as const,
                                geometry: {
                                    type: 'Point' as const,
                                    coordinates: [
                                        point.longitude,
                                        point.latitude,
                                    ],
                                },
                                properties: {
                                    weight: point.weight_kg,
                                    category: point.category,
                                    region: point.region_name ?? '',
                                },
                            })),
                        },
                    });
                    map.addLayer({
                        id: 'impact-clusters',
                        type: 'circle',
                        source: 'aggregate-impact',
                        filter: ['has', 'point_count'],
                        paint: {
                            'circle-color': [
                                'step',
                                ['get', 'point_count'],
                                '#4f9b63',
                                10,
                                '#247349',
                                30,
                                '#174e35',
                            ],
                            'circle-radius': [
                                'step',
                                ['get', 'point_count'],
                                18,
                                10,
                                24,
                                30,
                                31,
                            ],
                            'circle-stroke-color': '#ffffff',
                            'circle-stroke-width': 2,
                        },
                    });
                    map.addLayer({
                        id: 'impact-cluster-count',
                        type: 'symbol',
                        source: 'aggregate-impact',
                        filter: ['has', 'point_count'],
                        layout: {
                            'text-field': ['get', 'point_count_abbreviated'],
                            'text-size': 12,
                        },
                        paint: { 'text-color': '#ffffff' },
                    });
                    map.addLayer({
                        id: 'impact-point',
                        type: 'circle',
                        source: 'aggregate-impact',
                        filter: ['!', ['has', 'point_count']],
                        paint: {
                            'circle-color': '#d9a925',
                            'circle-radius': 8,
                            'circle-stroke-color': '#ffffff',
                            'circle-stroke-width': 2,
                        },
                    });
                    setLoading(false);
                });
                map.on('error', () => {
                    setLoading(false);
                    setError(true);
                });
            } catch {
                setLoading(false);
                setError(true);
            }
        }

        void initializeMap();

        return () => {
            disposed = true;
            map?.remove();
        };
    }, [cluster, points, styleUrl]);

    return (
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border bg-muted sm:min-h-[520px]">
            <div
                ref={containerRef}
                className="absolute inset-0"
                aria-label="Peta agregat kontribusi sampah"
            />
            {loading && (
                <div className="absolute inset-0 grid place-items-center bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle
                            className="size-5 animate-spin"
                            aria-hidden="true"
                        />
                        Memuat peta&hellip;
                    </div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-muted px-6 text-center">
                    <div>
                        <MapPin
                            className="mx-auto size-8 text-primary"
                            aria-hidden="true"
                        />
                        <p className="mt-3 font-semibold">
                            Peta belum dapat dimuat
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Periksa koneksi lalu muat ulang. Ringkasan data
                            tetap tersedia di halaman ini.
                        </p>
                    </div>
                </div>
            )}
            <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-start gap-2 rounded-xl border bg-background/94 px-3 py-2 text-xs shadow-lg backdrop-blur">
                <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                />
                <span>{privacyMessage}</span>
            </div>
        </div>
    );
}

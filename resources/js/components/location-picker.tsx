import { LoaderCircle, MapPin } from 'lucide-react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

type Coordinates = { latitude: number; longitude: number };

export function LocationPicker({
    value,
    onChange,
    styleUrl,
}: {
    value?: Coordinates | null;
    onChange: (coordinates: Coordinates) => void;
    styleUrl?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef(onChange);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        let disposed = false;
        let map: MapLibreMap | undefined;
        let marker: Marker | undefined;

        async function initialize() {
            try {
                const maplibregl = await import('maplibre-gl');

                if (disposed || !containerRef.current) {
                    return;
                }

                const center: [number, number] = value
                    ? [value.longitude, value.latitude]
                    : [112.651, -7.98];
                map = new maplibregl.Map({
                    container: containerRef.current,
                    style:
                        styleUrl ||
                        import.meta.env.VITE_MAP_STYLE_URL ||
                        'https://demotiles.maplibre.org/style.json',
                    center,
                    zoom: value ? 16 : 13,
                    attributionControl: false,
                });
                map.addControl(
                    new maplibregl.NavigationControl({ showCompass: false }),
                    'top-right',
                );
                map.addControl(
                    new maplibregl.AttributionControl({ compact: true }),
                );

                const placeMarker = (coordinates: Coordinates) => {
                    marker?.remove();
                    marker = new maplibregl.Marker({ color: '#237a4b' })
                        .setLngLat([
                            coordinates.longitude,
                            coordinates.latitude,
                        ])
                        .addTo(map!);
                };

                if (value) {
                    placeMarker(value);
                }

                map.on('click', (event) => {
                    const coordinates = {
                        latitude: event.lngLat.lat,
                        longitude: event.lngLat.lng,
                    };
                    placeMarker(coordinates);
                    onChangeRef.current(coordinates);
                });
                map.on('load', () => setLoading(false));
                map.on('error', () => {
                    setLoading(false);
                    setError(true);
                });
            } catch {
                setLoading(false);
                setError(true);
            }
        }

        void initialize();

        return () => {
            disposed = true;
            marker?.remove();
            map?.remove();
        };
        // The map is intentionally initialized once; subsequent selections are handled internally.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [styleUrl]);

    return (
        <div className="relative min-h-72 overflow-hidden rounded-2xl border bg-muted">
            <div
                ref={containerRef}
                className="absolute inset-0"
                aria-label="Pilih titik pengumpulan pada peta"
            />
            {loading && (
                <div className="absolute inset-0 grid place-items-center bg-muted">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle
                            className="size-5 animate-spin"
                            aria-hidden="true"
                        />{' '}
                        Memuat peta&hellip;
                    </span>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-muted px-6 text-center">
                    <div>
                        <MapPin
                            className="mx-auto size-7 text-primary"
                            aria-hidden="true"
                        />
                        <p className="mt-3 font-semibold">
                            Peta tidak dapat dimuat
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Coba lagi saat koneksi stabil. Form tidak akan
                            dikirim tanpa titik lokasi.
                        </p>
                    </div>
                </div>
            )}
            {!loading && !error && (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border bg-background/92 px-3 py-2 text-xs shadow">
                    Ketuk peta untuk menentukan titik
                </div>
            )}
        </div>
    );
}

import { AlertTriangle, Download, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui/button';

function subscribeToOnlineStatus(onStoreChange: () => void) {
    window.addEventListener('online', onStoreChange);
    window.addEventListener('offline', onStoreChange);

    return () => {
        window.removeEventListener('online', onStoreChange);
        window.removeEventListener('offline', onStoreChange);
    };
}

export function PwaStatus() {
    const online = useSyncExternalStore(
        subscribeToOnlineStatus,
        () => window.navigator.onLine,
        () => true,
    );
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const updateServiceWorker = useRef<null | (() => Promise<void>)>(null);

    useEffect(() => {
        const updateSW = registerSW({
            immediate: true,
            onNeedRefresh() {
                setUpdateAvailable(true);
            },
        });
        updateServiceWorker.current = async () => updateSW(true);
    }, []);

    return (
        <>
            {!online && (
                <div
                    role="status"
                    className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-amber-800 bg-amber-950 px-4 py-3 text-sm text-amber-100 shadow-xl"
                >
                    <WifiOff className="size-5 shrink-0" aria-hidden="true" />
                    <span>
                        Anda sedang offline. Materi publik yang pernah dibuka
                        mungkin tetap tersedia; transaksi tidak akan dikirim.
                    </span>
                </div>
            )}

            {updateAvailable && !dismissed && (
                <div
                    role="status"
                    className="fixed right-4 bottom-24 z-[100] w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-card p-4 shadow-2xl md:bottom-5"
                >
                    <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                            <Download className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">Pembaruan tersedia</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Muat ulang untuk memakai versi EcoVillage.id
                                terbaru.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Tutup pemberitahuan pembaruan"
                            onClick={() => setDismissed(true)}
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </div>
                    <Button
                        className="mt-4 w-full"
                        onClick={() => void updateServiceWorker.current?.()}
                    >
                        <AlertTriangle aria-hidden="true" />
                        Perbarui sekarang
                    </Button>
                </div>
            )}
        </>
    );
}

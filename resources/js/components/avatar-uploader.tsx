import { useForm, usePage } from '@inertiajs/react';
import { Camera, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

const ACCEPTED = 'image/jpeg,image/png,image/webp';

export default function AvatarUploader() {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();
    const fileInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const previewUrl = useRef<string | null>(null);

    const { data, setData, post, processing, progress, errors, clearErrors } =
        useForm<{ avatar: File | null }>({ avatar: null });

    const removal = useForm({});

    // Object URL harus dilepas manual, kalau tidak blob-nya menahan memori
    // selama tab masih terbuka.
    useEffect(
        () => () => {
            if (previewUrl.current !== null) {
                URL.revokeObjectURL(previewUrl.current);
            }
        },
        [],
    );

    const pick = (file?: File | null) => {
        clearErrors();

        if (previewUrl.current !== null) {
            URL.revokeObjectURL(previewUrl.current);
        }

        previewUrl.current =
            file === null || file === undefined
                ? null
                : URL.createObjectURL(file);

        setPreview(previewUrl.current);
        setData('avatar', file ?? null);
    };

    const discard = () => {
        pick(null);

        if (fileInput.current !== null) {
            fileInput.current.value = '';
        }
    };

    const submit = () => {
        post(ProfileController.updateAvatar.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: discard,
        });
    };

    const remove = () => {
        removal.delete(ProfileController.destroyAvatar.url(), {
            preserveScroll: true,
        });
    };

    const shown = preview ?? auth.user.avatar ?? undefined;
    const busy = processing || removal.processing;

    return (
        <div
            id="foto-profil"
            className="flex scroll-mt-24 flex-col gap-5 rounded-xl border bg-card/40 p-4 sm:flex-row sm:items-center"
        >
            <div className="relative shrink-0 self-start sm:self-center">
                <Avatar className="size-20 border border-border/60 shadow-sm ring-2 ring-background">
                    <AvatarImage src={shown} alt={auth.user.name} />
                    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                        {getInitials(auth.user.name)}
                    </AvatarFallback>
                </Avatar>

                <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={busy}
                    className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-60"
                    aria-label="Pilih foto profil"
                    data-test="pick-avatar-button"
                >
                    <Camera className="size-4" />
                </button>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium">
                        {preview === null
                            ? 'Foto profil'
                            : 'Pratinjau foto baru'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG, atau WebP. Maksimal 2 MB, minimal 96 x 96
                        piksel. Foto tampil pada sidebar dan menu akun Anda.
                    </p>
                </div>

                <input
                    ref={fileInput}
                    type="file"
                    accept={ACCEPTED}
                    className="sr-only"
                    onChange={(event) => pick(event.target.files?.[0])}
                    data-test="avatar-input"
                />

                {progress !== null && progress !== undefined && (
                    <div
                        className="h-1 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={progress.percentage ?? 0}
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-[width] duration-200"
                            style={{ width: `${progress.percentage ?? 0}%` }}
                        />
                    </div>
                )}

                <InputError message={errors.avatar} />

                <div className="flex flex-wrap items-center gap-2">
                    {data.avatar === null ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => fileInput.current?.click()}
                            >
                                <Upload className="mr-2 size-4" />
                                {auth.user.avatar
                                    ? 'Ganti foto'
                                    : 'Unggah foto'}
                            </Button>

                            {auth.user.avatar && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={remove}
                                    className="text-destructive hover:text-destructive"
                                    data-test="remove-avatar-button"
                                >
                                    <Trash2 className="mr-2 size-4" />
                                    Hapus foto
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={submit}
                                data-test="save-avatar-button"
                            >
                                {processing ? 'Mengunggah…' : 'Simpan foto'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={discard}
                            >
                                <X className="mr-2 size-4" />
                                Batal
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

import { Head } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import TextLink from '@/components/text-link';
import { login } from '@/routes';
import { request } from '@/routes/password';

export default function RegisterPending() {
    return (
        <>
            <Head title="Periksa email Anda" />

            <div
                className="flex flex-col items-center gap-6 text-center"
                data-reveal-group="up"
                data-reveal-distance="sm"
                data-reveal-step="55"
            >
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MailCheck className="size-7" aria-hidden="true" />
                </span>

                <p className="text-sm leading-6 text-muted-foreground">
                    Bila alamat itu belum memiliki akun, kami mengirimkan tautan
                    verifikasi ke sana. Buka tautan tersebut untuk mengaktifkan
                    akun, lalu masuk seperti biasa.
                </p>

                <p className="text-sm leading-6 text-muted-foreground">
                    Bila alamat tersebut ternyata sudah terdaftar, kami
                    mengirimkan pemberitahuan ke pemiliknya dan tidak ada akun
                    baru yang dibuat.
                </p>

                <div className="flex flex-col items-center gap-2 text-sm">
                    <TextLink href={login()}>Masuk ke akun Anda</TextLink>
                    <TextLink
                        href={request()}
                        className="text-muted-foreground"
                    >
                        Lupa kata sandi?
                    </TextLink>
                </div>
            </div>
        </>
    );
}

RegisterPending.layout = {
    title: 'Periksa email Anda',
    description:
        'Langkah berikutnya dikirim melalui email agar tidak ada informasi akun yang terungkap di halaman ini.',
};

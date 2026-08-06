import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email as sendResetLink } from '@/routes/password';

type Props = {
    status?: string;
};

export default function ForgotPassword({ status }: Props) {
    return (
        <>
            <Head title="Lupa kata sandi" />

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <Form
                {...sendResetLink.form()}
                className="flex flex-col gap-6"
                disableWhileProcessing
            >
                {({ processing, errors }) => (
                    <>
                        <div
                            className="grid gap-6"
                            data-reveal-group="up"
                            data-reveal-distance="sm"
                            data-reveal-step="55"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="email">Alamat email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="nama@gmail.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={2}
                                data-test="send-reset-link-button"
                            >
                                {processing && <Spinner />}
                                Kirim tautan setel ulang
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Ingat kata sandi Anda?{' '}
                            <TextLink href={login()} tabIndex={3}>
                                Masuk
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Setel ulang kata sandi',
    description:
        'Masukkan email akun Anda. Jika terdaftar, kami mengirimkan tautan setel ulang yang berlaku 60 menit.',
};

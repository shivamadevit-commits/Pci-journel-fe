'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api-client';
import { emailSchema, otpSchema } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/shared/loading-button';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState(useSearchParams().get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const em = emailSchema.safeParse(email);
    const code = otpSchema.safeParse(otp);
    if (!em.success) return setError(em.error.issues[0]!.message);
    if (!code.success) return setError(code.error.issues[0]!.message);
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/verify-email', { email: em.data, otp: code.data });
      toast.success('Email verified. You can now sign in.');
      router.push('/login');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    const em = emailSchema.safeParse(email);
    if (!em.success) return setError(em.error.issues[0]!.message);
    setError(null);
    try {
      await api.post('/auth/resend-verification', { email: em.data });
      toast.success('If the account is awaiting verification, a new code has been sent.');
      setCooldown(60);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MailCheck className="size-5" /> Verify your email</CardTitle>
        <CardDescription>Enter the code we sent to your email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="otp">Verification code</FieldLabel>
            <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="text-center font-mono text-lg tracking-[0.4em]" aria-invalid={!!error} />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <LoadingButton type="submit" className="w-full" loading={busy} loadingText="Verifying…">Verify email</LoadingButton>
          <div className="flex items-center justify-between text-sm">
            <Button type="button" variant="link" className="h-auto p-0" disabled={cooldown > 0} onClick={resend}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Button>
            <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

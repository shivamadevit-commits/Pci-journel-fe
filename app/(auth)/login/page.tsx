'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, api, errorMessage } from '@/lib/api-client';
import { ROLE_HOME, type Role } from '@/lib/constants/roles';
import { loginSchema, otpSchema, safeNext, type LoginValues } from '@/lib/schemas/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TextField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';
import { ME_KEY } from '@/hooks/use-auth';
import { applyApiErrors } from '@/lib/actions';

interface LoginResponse {
  otpRequired: boolean;
  challengeId?: string;
  expiresAt?: string;
  resendAvailableInSeconds?: number;
  user?: { role: Role };
}

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const next = safeNext(useSearchParams().get('next'));

  const [challenge, setChallenge] = useState<{ id: string; cooldown: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    if (!challenge || challenge.cooldown <= 0) return;
    const t = setTimeout(() => setChallenge((c) => (c ? { ...c, cooldown: c.cooldown - 1 } : c)), 1000);
    return () => clearTimeout(t);
  }, [challenge]);

  async function finish(role: Role) {
    await qc.invalidateQueries({ queryKey: ME_KEY });
    router.replace(next ?? ROLE_HOME[role]);
    router.refresh();
  }

  async function onLogin(values: LoginValues) {
    setFormError(null);
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', values);
      if (data.otpRequired && data.challengeId) {
        setChallenge({ id: data.challengeId, cooldown: data.resendAvailableInSeconds ?? 0 });
        toast.success('We emailed you a verification code.');
      } else if (data.user) await finish(data.user.role);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        toast.info(err.message);
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      if (!applyApiErrors(form, err)) setFormError(errorMessage(err));
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || busy) return;
    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) return setOtpError(parsed.error.issues[0]!.message);
    setOtpError(null);
    setBusy(true);
    try {
      const { data } = await api.post<LoginResponse>('/auth/login/verify-otp', { challengeId: challenge.id, otp: parsed.data });
      if (data.user) await finish(data.user.role);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CHALLENGE_EXPIRED') {
        setChallenge(null);
        setFormError('This sign-in attempt expired. Please sign in again.');
      } else setOtpError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!challenge) return;
    setResending(true);
    try {
      const { data } = await api.post<{ challengeId: string; resendAvailableInSeconds: number }>('/auth/login/resend-otp', { challengeId: challenge.id });
      setChallenge({ id: data.challengeId, cooldown: data.resendAvailableInSeconds });
      setOtp('');
      toast.success('A new code has been sent.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CHALLENGE_EXPIRED') {
        setChallenge(null);
        setFormError('This sign-in attempt expired. Please sign in again.');
      } else toast.error(errorMessage(err));
    } finally {
      setResending(false);
    }
  }

  if (challenge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" /> Verify it’s you</CardTitle>
          <CardDescription>Enter the one-time code we emailed to {form.getValues('email')}. It expires shortly and can be used once.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onVerify} className="space-y-4" noValidate>
            <Field data-invalid={!!otpError}>
              <FieldLabel htmlFor="otp">Verification code</FieldLabel>
              <Input id="otp" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={10} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} aria-invalid={!!otpError} className="text-center font-mono text-lg tracking-[0.4em]" />
              {otpError && <FieldError>{otpError}</FieldError>}
            </Field>
            <LoadingButton type="submit" className="w-full" loading={busy} loadingText="Verifying…">Verify and sign in</LoadingButton>
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="link" className="h-auto p-0" disabled={challenge.cooldown > 0 || resending} onClick={resend}>
                {challenge.cooldown > 0 ? `Resend code in ${challenge.cooldown}s` : resending ? 'Sending…' : 'Resend code'}
              </Button>
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => { setChallenge(null); setOtp(''); }}>Use a different account</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your portal account. A verification code will be emailed to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onLogin)} className="space-y-4" noValidate>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <TextField form={form} name="email" label="Email" type="email" autoComplete="username" autoFocus />
          <TextField form={form} name="password" label="Password" type="password" autoComplete="current-password" />
          <LoadingButton type="submit" className="w-full" loading={form.formState.isSubmitting} loadingText="Signing in…">Continue</LoadingButton>
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
            <Link href="/register" className="text-primary hover:underline">Create author account</Link>
          </div>
        </form>
        <p className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
          Interested in reviewing? <Link href="/reviewer-apply" className="text-primary hover:underline">Apply to become a reviewer</Link>
        </p>
      </CardContent>
    </Card>
  );
}

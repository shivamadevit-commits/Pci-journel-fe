'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { resetSchema, type ResetValues } from '@/lib/schemas/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';

/** Used for both password reset links and first-time account invitations (same endpoint). */
export function ResetPasswordForm({ mode }: { mode: 'reset' | 'invite' }) {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: '', confirm: '' } });
  const reset = useAction({
    fn: (v: ResetValues) => api.post('/auth/reset-password', { token, newPassword: v.newPassword }),
    form,
    onSuccess: () => router.push('/login'),
  });

  const invite = mode === 'invite';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="size-5" /> {invite ? 'Set your password' : 'Choose a new password'}</CardTitle>
        <CardDescription>{invite ? 'Welcome! Set a password to activate your account.' : 'All other sessions will be signed out once you save.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {!token ? (
          <Alert variant="destructive">
            <AlertDescription>This link is missing its token. Open the link from your email again{invite ? ', or ask the administrator to re-send the invitation' : ' or request a new one'}.</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={form.handleSubmit((v) => reset.mutate(v))} className="space-y-4" noValidate>
            <TextField form={form} name="newPassword" label="New password" type="password" autoComplete="new-password" required description="At least 10 characters with upper-case, lower-case and a digit." />
            <TextField form={form} name="confirm" label="Confirm password" type="password" autoComplete="new-password" required />
            <LoadingButton type="submit" className="w-full" loading={reset.isPending} loadingText="Saving…">{invite ? 'Activate account' : 'Reset password'}</LoadingButton>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          {reset.isError && !invite ? <Link href="/forgot-password" className="text-primary hover:underline">Request a new link</Link> : <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>}
        </p>
      </CardContent>
    </Card>
  );
}

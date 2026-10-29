'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailQuestion } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { forgotSchema } from '@/lib/schemas/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<{ email: string }>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });
  const forgot = useAction({
    fn: (v: { email: string }) => api.post('/auth/forgot-password', v),
    form,
    success: false,
    onSuccess: () => setSent(true),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MailQuestion className="size-5" /> Forgot your password?</CardTitle>
        <CardDescription>Enter your email and we’ll send a reset link if an account exists.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <Alert>
            <AlertDescription>If an account exists for that address, a password reset link has been sent. The link is single-use and expires soon.</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={form.handleSubmit((v) => forgot.mutate(v))} className="space-y-4" noValidate>
            <TextField form={form} name="email" label="Email" type="email" autoComplete="email" autoFocus />
            <LoadingButton type="submit" className="w-full" loading={forgot.isPending} loadingText="Sending…">Send reset link</LoadingButton>
          </form>
        )}
        <p className="mt-6 text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to sign in</Link></p>
      </CardContent>
    </Card>
  );
}

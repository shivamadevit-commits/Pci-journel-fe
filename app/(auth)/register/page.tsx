'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { registerSchema, type RegisterValues } from '@/lib/schemas/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { firstName: '', lastName: '', email: '', affiliation: '', country: '', password: '' } });
  const register = useAction({
    fn: (v: RegisterValues) => api.post('/auth/register', { ...v, affiliation: v.affiliation || undefined, country: v.country || undefined }),
    form,
    success: 'If the address can be registered, a verification code is on its way.',
    onSuccess: (_d, v) => router.push(`/verify-email?email=${encodeURIComponent(v.email)}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an author account</CardTitle>
        <CardDescription>Authors register here. Editors, production staff and reviewers receive an invitation instead.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => register.mutate(v))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="firstName" label="First name" autoComplete="given-name" required />
            <TextField form={form} name="lastName" label="Last name" autoComplete="family-name" required />
          </div>
          <TextField form={form} name="email" label="Email" type="email" autoComplete="email" required />
          <TextField form={form} name="affiliation" label="Affiliation" autoComplete="organization" />
          <TextField form={form} name="country" label="Country" autoComplete="country-name" />
          <TextField form={form} name="password" label="Password" type="password" autoComplete="new-password" required description="At least 10 characters with upper-case, lower-case and a digit." />
          <LoadingButton type="submit" className="w-full" loading={register.isPending} loadingText="Creating account…">Create account</LoadingButton>
          <p className="text-center text-sm text-muted-foreground">
            Already registered? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

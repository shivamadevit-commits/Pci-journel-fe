'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileValues } from '@/lib/schemas/admin';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { ME_KEY, useMe } from '@/hooks/use-auth';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/schemas/auth';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextField, TextareaField } from '@/components/forms/fields';
import { KeyValue } from '@/components/shared/stat-card';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';


export default function ProfilePage() {
  const me = useMe();
  return (
    <>
      <PageHeader title="Profile & security" description="Your account details and password." />
      <QueryBoundary query={me}>
        {(user) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <ProfileCard key={user.id} />
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <KeyValue
                    items={[
                      { label: 'Role', value: <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge> },
                      { label: 'Email', value: user.email },
                      { label: 'Last sign-in', value: formatDateTime(user.lastLoginAt) },
                      ...(user.reviewerProfile ? [{ label: 'Reviewer ID', value: <span className="font-mono">{user.reviewerProfile.reviewerCode}</span> }, { label: 'Subject areas', value: user.reviewerProfile.subjectAreas.map((s) => s.name).join(', ') || '—' }] : []),
                    ]}
                  />
                </CardContent>
              </Card>
              <PasswordCard />
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

function ProfileCard() {
  const me = useMe();
  const u = me.data!;
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: {} });

  useEffect(() => {
    form.reset({
      firstName: u.firstName,
      lastName: u.lastName,
      affiliation: u.authorProfile?.affiliation ?? '',
      country: u.authorProfile?.country ?? '',
      phone: u.authorProfile?.phone ?? '',
      designation: u.editorProfile?.designation ?? u.reviewerProfile?.designation ?? '',
      institution: u.reviewerProfile?.institution ?? '',
      qualificationNotes: u.reviewerProfile?.qualificationNotes ?? '',
    });
  }, [u, form]);

  const save = useAction({
    fn: (v: ProfileValues) => {
      // Only send fields relevant to the role, and never empty strings (the API validates formats).
      const send: Record<string, string> = { firstName: v.firstName, lastName: v.lastName };
      const keys = u.role === 'AUTHOR' ? ['affiliation', 'country', 'phone'] : u.role === 'REVIEWER' ? ['institution', 'designation', 'qualificationNotes'] : u.role === 'PRODUCTION' ? [] : ['designation'];
      for (const k of keys) {
        const val = v[k as keyof ProfileValues];
        if (val) send[k] = val;
      }
      return api.patch('/users/me/profile', send);
    },
    form,
    invalidate: [[...ME_KEY]],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Keep your details up to date.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="firstName" label="First name" required />
            <TextField form={form} name="lastName" label="Last name" required />
          </div>
          {u.role === 'AUTHOR' && (
            <>
              <TextField form={form} name="affiliation" label="Affiliation" />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField form={form} name="country" label="Country" />
                <TextField form={form} name="phone" label="Phone" type="tel" />
              </div>
            </>
          )}
          {(u.role === 'EDITOR' || u.role === 'ADMIN') && (
            <>
              <TextField form={form} name="designation" label="Designation" />
            </>
          )}
          {u.role === 'REVIEWER' && (
            <>
              <TextField form={form} name="institution" label="Institution" />
              <TextField form={form} name="designation" label="Designation" />
              <TextareaField form={form} name="qualificationNotes" label="Qualifications" />
            </>
          )}
          <LoadingButton type="submit" loading={save.isPending} loadingText="Saving…">Save changes</LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });
  const change = useAction({
    fn: (v: ChangePasswordValues) => api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword }),
    form,
    onSuccess: () => form.reset(),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Other devices will be signed out.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="space-y-4" noValidate>
          <TextField form={form} name="currentPassword" label="Current password" type="password" autoComplete="current-password" required />
          <TextField form={form} name="newPassword" label="New password" type="password" autoComplete="new-password" required description="At least 10 characters with upper-case, lower-case and a digit." />
          <TextField form={form} name="confirm" label="Confirm new password" type="password" autoComplete="new-password" required />
          <LoadingButton type="submit" loading={change.isPending} loadingText="Updating…">Update password</LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}

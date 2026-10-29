'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { reviewerApplicationSchema, type ReviewerApplicationValues } from '@/lib/schemas/auth';
import type { SubjectArea } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckboxField, TextField, TextareaField } from '@/components/forms/fields';
import { FileInput } from '@/components/shared/file-input';
import { LoadingButton } from '@/components/shared/loading-button';

export default function ReviewerApplyPage() {
  const [done, setDone] = useState(false);
  const [cv, setCv] = useState<File | null>(null);
  const areas = useQuery({ queryKey: ['subject-areas'], queryFn: async () => (await api.get<SubjectArea[]>('/subject-areas')).data });

  const form = useForm<ReviewerApplicationValues>({
    resolver: zodResolver(reviewerApplicationSchema),
    defaultValues: { firstName: '', lastName: '', email: '', institution: '', designation: '', highestQualification: '', holdsMPharm: false, yearsTeaching: 0, statement: '', subjectAreaIds: [] },
  });

  const apply = useAction({
    fn: (v: ReviewerApplicationValues) => {
      const fd = new FormData();
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined || val === '') continue;
        fd.append(k, Array.isArray(val) ? JSON.stringify(val) : String(val));
      }
      if (cv) fd.append('cv', cv);
      return api.upload('POST', '/reviewer-applications', fd);
    },
    form,
    success: false,
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <p className="text-lg font-semibold">Application received</p>
          <p className="text-sm text-muted-foreground">Thank you. The editor will review your application. If it is approved you will receive an email invitation with your Reviewer ID.</p>
          <Link href="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Apply to become a reviewer</CardTitle>
        <CardDescription>The Editor decides who becomes a reviewer. Proposed minimum: M.Pharm or 10 years of teaching experience (final criteria to be confirmed by PCI).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => apply.mutate(v))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="firstName" label="First name" required />
            <TextField form={form} name="lastName" label="Last name" required />
          </div>
          <TextField form={form} name="email" label="Email" type="email" required />
          <TextField form={form} name="institution" label="Institution" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="designation" label="Designation" />
            <TextField form={form} name="highestQualification" label="Highest qualification" required />
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <TextField form={form} name="yearsTeaching" label="Years of teaching experience" type="number" min={0} max={70} required />
            <CheckboxField form={form} name="holdsMPharm" label="I hold an M.Pharm degree" />
          </div>
          <Controller
            control={form.control}
            name="subjectAreaIds"
            render={({ field, fieldState }) => (
              <FieldSet>
                <FieldLegend variant="label">Subject areas <span className="text-destructive">*</span></FieldLegend>
                {areas.isError && <Alert variant="destructive"><AlertDescription>Could not load subject areas. Please refresh.</AlertDescription></Alert>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {(areas.data ?? []).map((a) => (
                    <Field key={a.id} orientation="horizontal">
                      <Checkbox
                        id={`area-${a.id}`}
                        checked={field.value.includes(a.id)}
                        onCheckedChange={(c) => field.onChange(c === true ? [...field.value, a.id] : field.value.filter((x) => x !== a.id))}
                      />
                      <FieldLabel htmlFor={`area-${a.id}`} className="font-normal">{a.name}</FieldLabel>
                    </Field>
                  ))}
                </div>
                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
              </FieldSet>
            )}
          />
          <TextareaField form={form} name="statement" label="Statement of expertise" required rows={5} description="Briefly describe your reviewing experience and areas of expertise." />
          <FileInput label="CV (optional)" accept=".pdf,.docx" value={cv} onChange={setCv} description="PDF or Word (.docx)." />
          <LoadingButton type="submit" className="w-full" loading={apply.isPending} loadingText="Submitting…">Submit application</LoadingButton>
          <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to sign in</Link></p>
        </form>
      </CardContent>
    </Card>
  );
}

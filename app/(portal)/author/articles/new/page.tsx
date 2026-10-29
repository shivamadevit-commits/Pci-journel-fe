'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useFeatures } from '@/hooks/use-features';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { submissionSchema, type SubmissionInput, type SubmissionValues } from '@/lib/schemas/article';
import { useMe } from '@/hooks/use-auth';
import type { SubjectArea } from '@/types/domain';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { CheckboxField, SelectField, TextField, TextareaField } from '@/components/forms/fields';
import { FileInput } from '@/components/shared/file-input';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';

interface SubmitResult {
  id: string;
  submissionId: string;
  wordCount: number;
  wordLimitExceeded: boolean;
  wordLimit: number;
}

const emptyAuthor = { firstName: '', lastName: '', email: '', affiliation: '', isCorresponding: false };

export default function NewSubmissionPage() {
  const router = useRouter();
  const me = useMe();
  const { paymentEnabled } = useFeatures();
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [titlePage, setTitlePage] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const areas = useQuery({ queryKey: ['subject-areas'], queryFn: async () => (await api.get<SubjectArea[]>('/subject-areas')).data });

  const form = useForm<SubmissionInput, unknown, SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { title: '', abstract: '', ethicsStatement: '', subjectAreaId: '', keywords: '', authors: [{ ...emptyAuthor, isCorresponding: true }], confirmAnonymised: false },
  });
  const authors = useFieldArray({ control: form.control, name: 'authors' });

  // Pre-fill the first author from the signed-in account (editable).
  useEffect(() => {
    const u = me.data;
    if (u && !form.getValues('authors.0.email')) {
      form.setValue('authors.0.firstName', u.firstName);
      form.setValue('authors.0.lastName', u.lastName);
      form.setValue('authors.0.email', u.email);
      form.setValue('authors.0.affiliation', u.authorProfile?.affiliation ?? '');
    }
  }, [me.data, form]);

  const submit = useAction({
    fn: (v: SubmissionValues) => {
      const metadata = {
        ...v,
        subjectAreaId: v.subjectAreaId || undefined,
        authors: v.authors.map((a) => ({ ...a, affiliation: a.affiliation || undefined })),
      };
      const fd = new FormData();
      fd.append('metadata', JSON.stringify(metadata));
      fd.append('manuscript', manuscript!);
      if (titlePage) fd.append('titlePage', titlePage);
      return api.upload<SubmitResult>('POST', '/author/articles', fd);
    },
    form,
    invalidate: [['author']],
    success: false,
    onSuccess: (r) => {
      toast.success(`Submitted as ${r.submissionId}`);
      if (r.wordLimitExceeded) toast.warning(`Your manuscript has ${r.wordCount.toLocaleString()} words, above the ${r.wordLimit.toLocaleString()}-word limit. The editor will be informed.`, { duration: 10000 });
      router.push(`/author/articles/${r.id}`);
    },
  });

  function onSubmit(v: SubmissionValues) {
    if (!manuscript) return setFileError('Upload your manuscript as a Word (.docx) file.');
    setFileError(null);
    submit.mutate(v);
  }

  return (
    <>
      <PageHeader title="New submission" breadcrumbs={[{ label: 'My submissions', href: '/author/articles' }, { label: 'New' }]} description="Submit your manuscript in Microsoft Word format with keywords and an ethics statement." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Manuscript details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField form={form} name="title" label="Title" required />
            <TextareaField form={form} name="abstract" label="Abstract" required rows={6} />
            <SelectField form={form} name="subjectAreaId" label="Subject area" placeholder="Select a subject area" options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))} />
            <TextField form={form} name="keywords" label="Keywords" required description="Separate with commas (1–10 keywords)." />
            <TextareaField form={form} name="ethicsStatement" label="Ethics statement" required rows={4} description="Ethical approval, consent and conflict-of-interest declarations." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authors</CardTitle>
            <CardDescription>List every author in order. Exactly one should be the corresponding author. Author details are never shown to reviewers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authors.fields.map((f, i) => (
              <div key={f.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Author {i + 1}</p>
                  {authors.fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove author ${i + 1}`} onClick={() => authors.remove(i)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField form={form} name={`authors.${i}.firstName`} label="First name" required />
                  <TextField form={form} name={`authors.${i}.lastName`} label="Last name" required />
                  <TextField form={form} name={`authors.${i}.email`} label="Email" type="email" required />
                </div>
                <TextField form={form} name={`authors.${i}.affiliation`} label="Affiliation" />
                <Controller
                  control={form.control}
                  name={`authors.${i}.isCorresponding`}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`corr-${i}`}
                        checked={!!field.value}
                        onCheckedChange={(c) => {
                          // single corresponding author
                          authors.fields.forEach((_, j) => form.setValue(`authors.${j}.isCorresponding`, c === true && j === i));
                        }}
                      />
                      <FieldLabel htmlFor={`corr-${i}`} className="font-normal">Corresponding author</FieldLabel>
                    </Field>
                  )}
                />
              </div>
            ))}
            {typeof form.formState.errors.authors?.message === 'string' && <FieldError>{form.formState.errors.authors.message}</FieldError>}
            {typeof form.formState.errors.authors?.root?.message === 'string' && <FieldError>{form.formState.errors.authors.root.message}</FieldError>}
            <Button type="button" variant="outline" size="sm" disabled={authors.fields.length >= 30} onClick={() => authors.append({ ...emptyAuthor })}>
              <Plus className="size-4" /> Add author
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>Only Word (.docx) is accepted. The server verifies the file content, not just its name.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <TriangleAlert className="size-4" />
              <AlertTitle>Double-blind review</AlertTitle>
              <AlertDescription>The manuscript must not contain author names, affiliations or acknowledgements. Put author details in the separate title page, which reviewers never receive.</AlertDescription>
            </Alert>
            <FileInput label="Anonymised manuscript" required accept=".docx" value={manuscript} onChange={(f) => { setManuscript(f); setFileError(null); }} error={fileError ?? undefined} description="Approximately 5,000 words maximum; longer manuscripts are flagged for the editor." />
            <FileInput label="Title page with author details (optional)" accept=".docx" value={titlePage} onChange={setTitlePage} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-1">
            <CheckboxField form={form} name="confirmAnonymised" label="I confirm the manuscript file is anonymised for double-blind review." />
            {paymentEnabled && <p className="text-xs text-muted-foreground">The Article Publishing Charge (APC) status is tracked after submission; payment rules are confirmed by PCI.</p>}
            <div className="flex gap-2">
              <LoadingButton type="submit" loading={submit.isPending} loadingText="Uploading and submitting…">Submit manuscript</LoadingButton>
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submit.isPending}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}

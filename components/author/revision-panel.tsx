'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextareaField } from '@/components/forms/fields';
import { FileInput } from '@/components/shared/file-input';
import { LoadingButton } from '@/components/shared/loading-button';

/** Shown only when the Editor requested a revision (status REVISION_REQUESTED). The API re-checks this. */
export function RevisionPanel({ articleId }: { articleId: string }) {
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [titlePage, setTitlePage] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const form = useForm<{ changeNote: string }>({ defaultValues: { changeNote: '' } });

  const upload = useAction({
    fn: (v: { changeNote: string }) => {
      const fd = new FormData();
      if (v.changeNote.trim()) fd.append('changeNote', v.changeNote.trim());
      fd.append('manuscript', manuscript!);
      if (titlePage) fd.append('titlePage', titlePage);
      return api.upload('POST', `/author/articles/${articleId}/versions`, fd);
    },
    form,
    invalidate: [['author', 'article', articleId], ['author', 'articles']],
    onSuccess: () => {
      setManuscript(null);
      setTitlePage(null);
      form.reset();
    },
  });

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle>Upload revised manuscript</CardTitle>
        <CardDescription>The editor has requested a revision. Upload an anonymised Word (.docx) file; earlier versions are preserved.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => {
            if (!manuscript) return setFileError('Choose the revised manuscript (.docx).');
            setFileError(undefined);
            upload.mutate(v);
          })}
        >
          <FileInput label="Revised manuscript" required accept=".docx" value={manuscript} onChange={(f) => { setManuscript(f); setFileError(undefined); }} error={fileError} />
          <FileInput label="Updated title page (optional)" accept=".docx" value={titlePage} onChange={setTitlePage} />
          <TextareaField form={form} name="changeNote" label="Summary of changes" rows={4} />
          <LoadingButton type="submit" loading={upload.isPending} loadingText="Uploading…">Submit revision</LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}

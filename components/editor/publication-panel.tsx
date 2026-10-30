'use client';

import { FieldValidation } from '@/components/forms/field-validation';
import { publicationDateSchema } from '@/lib/schemas/editorial';
import { firstError } from '@/lib/validation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Rocket } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate } from '@/lib/format';
import type { EditorArticleDetail, PublicationStaffView } from '@/types/domain';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DownloadButton } from '@/components/shared/download-button';
import { LoadingButton } from '@/components/shared/loading-button';
import { PublicationMetadataForm } from '@/components/shared/publication-metadata-form';
import { QueryBoundary } from '@/components/shared/states';
import { refreshArticle } from './keys';

const PRODUCTION_PHASE = ['IN_PRODUCTION', 'PROOF_SENT_TO_AUTHOR', 'CORRECTION_REQUIRED', 'MAJOR_CONTENT_CHANGE_EDITOR_REVIEW', 'FINAL_PRODUCTION', 'PUBLISHED'];

export function PublicationPanel({ article }: { article: EditorArticleDetail }) {
  const id = article.id;
  const enabled = PRODUCTION_PHASE.includes(article.status);
  const key = ['publication', id];
  const q = useQuery({ queryKey: key, enabled, queryFn: async () => (await api.get<PublicationStaffView>(`/publication/articles/${id}`)).data });
  const [date, setDate] = useState('');
  const invalidate = [key, ...refreshArticle(id)];
  const publish = useAction({ fn: () => api.post(`/publication/articles/${id}/publish`, { publishedAt: date ? new Date(`${date}T00:00:00`).toISOString() : undefined }), invalidate });

  if (!enabled) {
    return (
      <Card>
        <CardHeader><CardTitle>Publication</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Publication opens once the article is accepted and in production.</p></CardContent>
      </Card>
    );
  }

  return (
    <QueryBoundary query={q}>
      {(v) => {
        const published = v.article.status === 'PUBLISHED';
        const ready = v.readiness.ready;
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Rocket className="size-5" /> Publication</CardTitle>
                <CardDescription>The Editor / Admin authorises publication once production is complete and all required items are present.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {v.publication?.htmlFileId ? <DownloadButton fileId={v.publication.htmlFileId}>Final HTML</DownloadButton> : <span className="text-sm text-muted-foreground">Final HTML not uploaded</span>}
                  {v.publication?.pdfFileId ? <DownloadButton fileId={v.publication.pdfFileId}>Final PDF</DownloadButton> : <span className="text-sm text-muted-foreground">Final PDF not uploaded</span>}
                </div>

                {published ? (
                  <Alert>
                    <CheckCircle2 className="size-4" />
                    <AlertTitle>Published</AlertTitle>
                    <AlertDescription>Published on {formatDate(v.publication?.publishedAt)}.</AlertDescription>
                  </Alert>
                ) : article.status === 'FINAL_PRODUCTION' ? (
                  <>
                    {ready ? (
                      <Alert><CheckCircle2 className="size-4" /><AlertTitle>Ready to publish</AlertTitle><AlertDescription>All publication requirements are met.</AlertDescription></Alert>
                    ) : (
                      <Alert variant="destructive">
                        <CircleAlert className="size-4" />
                        <AlertTitle>Not ready</AlertTitle>
                        <AlertDescription>Missing: {v.readiness.missing.join(', ')}.</AlertDescription>
                      </Alert>
                    )}
                    <Field className="sm:w-64">
                      <FieldLabel htmlFor="pubdate">Publication date</FieldLabel>
                      <Input id="pubdate" type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!firstError(publicationDateSchema(new Date().toISOString().slice(0, 10)), date)} />
                      <FieldValidation schema={publicationDateSchema(new Date().toISOString().slice(0, 10))} value={date} />
                      <FieldDescription>Defaults to today.</FieldDescription>
                    </Field>
                    <ConfirmDialog
                      title="Publish this article?"
                      description="The article becomes publicly visible as HTML and PDF and the author is notified."
                      confirmLabel="Publish"
                      disabled={!ready || !!firstError(publicationDateSchema(new Date().toISOString().slice(0, 10)), date)}
                      onConfirm={() => publish.mutateAsync()}
                      trigger={<LoadingButton loading={publish.isPending} disabled={!ready || !!firstError(publicationDateSchema(new Date().toISOString().slice(0, 10)), date)}>Authorise publication…</LoadingButton>}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Production is still in progress ({v.article.statusLabel}).</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publication metadata</CardTitle>
                <CardDescription>{v.requiredMetadata.length ? `Required before publishing: ${v.requiredMetadata.join(', ')}.` : 'No additional metadata fields are mandatory yet (pending PCI).'}</CardDescription>
              </CardHeader>
              <CardContent>
                <PublicationMetadataForm articleId={id} metadata={v.publication?.metadata} required={v.requiredMetadata} invalidate={invalidate} />
              </CardContent>
            </Card>
          </div>
        );
      }}
    </QueryBoundary>
  );
}

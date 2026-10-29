'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, MessageSquareWarning, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { correctionSchema, type CorrectionValues } from '@/lib/schemas/article';
import { formatDateTime } from '@/lib/format';
import type { ProofSummary } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField, TextField, TextareaField } from '@/components/forms/fields';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DownloadButton } from '@/components/shared/download-button';
import { LoadingButton } from '@/components/shared/loading-button';
import { EmptyState, QueryBoundary } from '@/components/shared/states';
import { EnumBadge } from '@/components/shared/status-badge';

const PROOF_TONE = { PENDING_REVIEW: 'warning', APPROVED: 'success', CORRECTIONS_REQUESTED: 'info', SUPERSEDED: 'neutral', PENDING_DELIVERY: 'neutral' } as const;

export function AuthorProofsPanel({ articleId }: { articleId: string }) {
  const key = ['author', 'proofs', articleId];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get<ProofSummary[]>(`/author/articles/${articleId}/proofs`)).data });
  const [correcting, setCorrecting] = useState<ProofSummary | null>(null);

  const approve = useAction({
    fn: (proofId: string) => api.post(`/author/articles/${articleId}/proofs/${proofId}/approve`, {}),
    invalidate: [key, ['author', 'article', articleId], ['author', 'articles']],
  });

  return (
    <>
      <QueryBoundary query={q}>
        {(proofs) =>
          proofs.length === 0 ? (
            <EmptyState title="No proofs yet" description="When production sends a proof it will appear here for your review." />
          ) : (
            <div className="space-y-4">
              {proofs.map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">Proof v{p.versionNumber} <EnumBadge value={p.authorStatus} tone={PROOF_TONE[p.authorStatus]} /></CardTitle>
                      <DownloadButton fileId={p.fileId} fallbackName={`proof-v${p.versionNumber}`} />
                    </div>
                    <CardDescription>Sent {formatDateTime(p.sentToAuthorAt)}{p.authorRespondedAt ? ` · you responded ${formatDateTime(p.authorRespondedAt)}` : ''}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {p.authorFeedback && <p className="rounded-md bg-muted/50 p-3 text-sm">Your feedback: {p.authorFeedback}</p>}
                    {p.corrections && p.corrections.length > 0 && (
                      <ul className="divide-y rounded-lg border text-sm">
                        {p.corrections.map((c) => (
                          <li key={c.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p>{c.description}</p>
                              {c.location && <p className="text-xs text-muted-foreground">Location: {c.location}</p>}
                            </div>
                            <div className="flex gap-1.5">
                              <EnumBadge value={c.type} tone={c.type === 'MAJOR' ? 'warning' : 'neutral'} />
                              <EnumBadge value={c.status} tone={c.status === 'IMPLEMENTED' || c.status === 'APPROVED_BY_EDITOR' ? 'success' : c.status === 'REJECTED_BY_EDITOR' ? 'danger' : 'info'} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.authorStatus === 'PENDING_REVIEW' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <ConfirmDialog
                          title="Approve this proof?"
                          description="Approving confirms there are no further corrections and moves the article to final production."
                          confirmLabel="Approve proof"
                          onConfirm={() => approve.mutateAsync(p.id)}
                          trigger={<Button disabled={approve.isPending}><CheckCircle2 className="size-4" /> Approve – no corrections</Button>}
                        />
                        <Button variant="outline" onClick={() => setCorrecting(p)}>
                          <MessageSquareWarning className="size-4" /> Request corrections
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </QueryBoundary>
      {correcting && <CorrectionsDialog articleId={articleId} proof={correcting} onClose={() => setCorrecting(null)} />}
    </>
  );
}

function CorrectionsDialog({ articleId, proof, onClose }: { articleId: string; proof: ProofSummary; onClose: () => void }) {
  const form = useForm<CorrectionValues>({ resolver: zodResolver(correctionSchema), defaultValues: { feedback: '', corrections: [{ type: 'MINOR', location: '', description: '' }] } });
  const items = useFieldArray({ control: form.control, name: 'corrections' });
  const submit = useAction({
    fn: (v: CorrectionValues) =>
      api.post(`/author/articles/${articleId}/proofs/${proof.id}/corrections`, {
        feedback: v.feedback || undefined,
        corrections: v.corrections.map((c) => ({ ...c, location: c.location || undefined })),
      }),
    form,
    invalidate: [['author', 'proofs', articleId], ['author', 'article', articleId], ['author', 'articles']],
    onSuccess: onClose,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Corrections for proof v{proof.versionNumber}</DialogTitle>
          <DialogDescription>Minor items (grammar, spelling, typography) go to production. Major content changes are routed to the Editor for approval before production acts.</DialogDescription>
        </DialogHeader>
        <form id="corrections-form" onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4" noValidate>
          {items.fields.map((f, i) => (
            <div key={f.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Correction {i + 1}</p>
                {items.fields.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove correction ${i + 1}`} onClick={() => items.remove(i)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField form={form} name={`corrections.${i}.type`} label="Type" options={[{ value: 'MINOR', label: 'Minor' }, { value: 'MAJOR', label: 'Major content change' }]} />
                <TextField form={form} name={`corrections.${i}.location`} label="Location" placeholder="Page / paragraph" className="sm:col-span-2" />
              </div>
              <TextareaField form={form} name={`corrections.${i}.description`} label="Description" rows={3} required />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={items.fields.length >= 100} onClick={() => items.append({ type: 'MINOR', location: '', description: '' })}>
            <Plus className="size-4" /> Add another
          </Button>
          <TextareaField form={form} name="feedback" label="Overall feedback (optional)" rows={3} />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <LoadingButton type="submit" form="corrections-form" loading={submit.isPending} loadingText="Submitting…">Submit corrections</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

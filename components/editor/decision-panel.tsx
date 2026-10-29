'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Gavel } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import { fullName } from '@/lib/links';
import { STATUS_LABELS } from '@/lib/constants/status';
import type { EditorArticleDetail } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectField, TextareaField } from '@/components/forms/fields';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/states';
import { EnumBadge } from '@/components/shared/status-badge';
import { LoadingButton } from '@/components/shared/loading-button';
import { refreshArticle } from './keys';

const schema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT', 'REQUEST_REVISION'], { error: 'Choose a decision' }),
  notes: z.string().trim().max(5000).optional(),
  authorMessage: z.string().trim().max(5000).optional(),
});
type Values = z.infer<typeof schema>;

const LABEL: Record<string, string> = {
  PROCEED_TO_PLAGIARISM_CHECK: 'Proceeded to plagiarism check',
  REJECT_AT_SCREENING: 'Rejected at screening',
  CLEAR_FOR_REVIEW: 'Cleared for reviewer assignment',
  REJECT_AFTER_PLAGIARISM: 'Rejected after plagiarism check',
  ACCEPT: 'Accepted',
  REJECT: 'Rejected',
  REQUEST_REVISION: 'Revision requested',
};

export function DecisionPanel({ article }: { article: EditorArticleDetail }) {
  const canDecide = article.status === 'REVIEWS_RECEIVED' || article.status === 'UNDER_EDITORIAL_DECISION';
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { decision: undefined, notes: '', authorMessage: '' } });
  const decide = useAction({ fn: (v: Values) => api.post(`/editorial/articles/${article.id}/decision`, { decision: v.decision, notes: v.notes || undefined, authorMessage: v.authorMessage || undefined }), form, invalidate: refreshArticle(article.id) });

  const submitted = article.reviews.filter((r) => r.report).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gavel className="size-5" /> Final editorial decision</CardTitle>
          <CardDescription>Reviewer recommendations support, but do not replace, your decision. Only comments you approved are shared with the author.</CardDescription>
        </CardHeader>
        <CardContent>
          {canDecide ? (
            <form className="space-y-4" noValidate onSubmit={(e) => e.preventDefault()}>
              {submitted < 2 && <Alert variant="destructive"><AlertDescription>Both reviewer reports must be submitted before deciding.</AlertDescription></Alert>}
              <SelectField
                form={form}
                name="decision"
                label="Decision"
                required
                options={[
                  { value: 'ACCEPT', label: 'Accept → Production' },
                  { value: 'REJECT', label: 'Reject' },
                  { value: 'REQUEST_REVISION', label: 'Request revision (if enabled by PCI policy)' },
                ]}
              />
              <TextareaField form={form} name="authorMessage" label="Message to the author" description="Shown to the author with the decision. Do not include reviewer identities." rows={4} />
              <TextareaField form={form} name="notes" label="Internal decision notes" description="Editors only." rows={3} />
              <ConfirmDialog
                title="Record this decision?"
                description="The author will be notified. This decision cannot be edited afterwards."
                confirmLabel="Record decision"
                disabled={!form.watch('decision') || submitted < 2}
                destructive={form.watch('decision') === 'REJECT'}
                onConfirm={async () => {
                  const ok = await form.trigger();
                  if (!ok) throw new Error('invalid');
                  await decide.mutateAsync(form.getValues());
                }}
                trigger={<LoadingButton type="button" loading={decide.isPending} disabled={submitted < 2 || !form.watch('decision')}>Record decision…</LoadingButton>}
              />
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              {article.status === 'UNDER_REVIEW' ? 'Waiting for both reviewers to submit their reports.' : `A final decision is not available while the article is “${STATUS_LABELS[article.status]}”.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Decision history</CardTitle></CardHeader>
        <CardContent>
          {article.decisions.length === 0 ? (
            <EmptyState title="No decisions recorded" />
          ) : (
            <ol className="space-y-3">
              {article.decisions.map((d) => (
                <li key={d.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">{LABEL[d.decision] ?? d.decision} <EnumBadge value={d.toStatus} /></span>
                    <span className="text-xs text-muted-foreground">{fullName(d.decidedBy)} · {formatDateTime(d.decidedAt)}</span>
                  </div>
                  {d.notes && <p className="mt-2 whitespace-pre-wrap"><span className="text-muted-foreground">Notes: </span>{d.notes}</p>}
                  {d.authorMessage && <p className="mt-1 whitespace-pre-wrap"><span className="text-muted-foreground">Message to author: </span>{d.authorMessage}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

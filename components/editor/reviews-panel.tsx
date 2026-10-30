'use client';

import { FieldValidation } from '@/components/forms/field-validation';
import { reviewCommentSchema } from '@/lib/schemas/editorial';
import { firstError } from '@/lib/validation';
import { useState } from 'react';
import { FileText, Lock, Save } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import { recommendationLabel, sectionLabel } from '@/lib/constants/status';
import type { EditorArticleDetail } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/shared/loading-button';
import { EmptyState } from '@/components/shared/states';
import { refreshArticle } from './keys';

interface Draft {
  approved: boolean;
  edited: string;
}

export function ReviewsPanel({ article }: { article: EditorArticleDetail }) {
  // Re-mount when the server-side disclosure state changes so local edits always start from what is saved.
  const serverKey = article.reviews.flatMap((r) => r.report?.comments.map((c) => `${c.id}:${c.approvedForAuthor}:${c.editedBody ?? ''}`) ?? []).join('|');
  return <ReviewsInner key={serverKey} article={article} />;
}

function ReviewsInner({ article }: { article: EditorArticleDetail }) {
  const reports = article.reviews.filter((r) => r.report);
  const editable = article.status === 'REVIEWS_RECEIVED' || article.status === 'UNDER_EDITORIAL_DECISION';

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    for (const r of reports) for (const c of r.report!.comments) init[c.id] = { approved: c.approvedForAuthor, edited: c.editedBody ?? '' };
    return init;
  });

  const save = useAction({
    fn: () =>
      api.put(`/editorial/articles/${article.id}/reviews/comments`, {
        items: Object.entries(drafts).map(([commentId, d]) => ({ commentId, approved: d.approved, editedBody: d.approved && d.edited.trim() ? d.edited.trim() : null })),
      }),
    invalidate: refreshArticle(article.id),
  });

  if (reports.length === 0) return <EmptyState icon={<FileText className="size-8" />} title="No review reports yet" description="Submitted reports appear here. Drafts remain private to the reviewer." />;

  const approvedCount = Object.values(drafts).filter((d) => d.approved).length;

  return (
    <div className="space-y-6">
      <Alert>
        <Lock className="size-4" />
        <AlertDescription>
          Reviewer comments reach you first. Tick <strong>Share with author</strong> for each comment you want released (optionally rewording it). Nothing else is ever shown to the author, and comments marked confidential cannot be shared.
        </AlertDescription>
      </Alert>

      {reports.map((r) => (
        <Card key={r.assignmentId}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {r.label} — {r.reviewer.name} <span className="font-mono text-xs font-normal text-muted-foreground">{r.reviewer.reviewerCode}</span>
            </CardTitle>
            <CardDescription>
              Recommendation: <Badge variant="secondary">{recommendationLabel(r.report!.recommendation)}</Badge> · submitted {formatDateTime(r.report!.submittedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.report!.comments.map((c) => {
              const confidential = c.section === 'CONFIDENTIAL_TO_EDITOR';
              const d = drafts[c.id];
              return (
                <div key={c.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{sectionLabel(c.section)}</p>
                    {confidential ? (
                      <Badge variant="outline">Never shared</Badge>
                    ) : (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={!!d?.approved} disabled={!editable} onCheckedChange={(v) => setDrafts((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? { edited: '' }), approved: v === true } }))} />
                        Share with author
                      </label>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                  {!confidential && d?.approved && (
                    <div className="space-y-1">
                      <label htmlFor={`edit-${c.id}`} className="text-xs text-muted-foreground">Reworded version for the author (optional — leave empty to share as written)</label>
                      <Textarea id={`edit-${c.id}`} rows={3} maxLength={10000} disabled={!editable} value={d.edited} onChange={(e) => setDrafts((s) => ({ ...s, [c.id]: { ...s[c.id]!, edited: e.target.value } }))} />
                      <FieldValidation schema={reviewCommentSchema} value={d.edited} />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <LoadingButton loading={save.isPending} disabled={!editable || Object.keys(drafts).length === 0 || Object.values(drafts).some((x) => !!firstError(reviewCommentSchema, x.edited))} onClick={() => save.mutate()}>
          <Save className="size-4" /> Save disclosure choices
        </LoadingButton>
        <span className="text-sm text-muted-foreground">{approvedCount} comment(s) will be shared</span>
        {!editable && <span className="text-sm text-muted-foreground">Locked after the final decision.</span>}
      </div>
    </div>
  );
}

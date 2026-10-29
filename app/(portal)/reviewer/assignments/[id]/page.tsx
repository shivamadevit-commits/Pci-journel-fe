'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EyeOff, Lock, Save, Send, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';
import { COMMENT_SECTIONS, RECOMMENDATIONS, recommendationLabel, sectionLabel } from '@/lib/constants/status';
import type { AssignmentDetail } from '@/types/domain';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DownloadButton } from '@/components/shared/download-button';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';
import { KeyValue } from '@/components/shared/stat-card';
import { EnumBadge } from '@/components/shared/status-badge';

type Sections = Record<string, string>;

export default function ReviewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = ['reviewer', 'assignment', id];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get<AssignmentDetail>(`/reviewer/assignments/${id}`)).data });
  return (
    <QueryBoundary query={q}>
      {(a) => (
        <>
          <PageHeader
            breadcrumbs={[{ label: 'Assigned manuscripts', href: '/reviewer/assignments' }, { label: a.article.submissionId }]}
            title={a.article.title}
            description={
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{a.article.submissionId}</span>
                <EnumBadge value={a.status} tone={a.status === 'SUBMITTED' ? 'success' : a.status === 'ASSIGNED' ? 'warning' : 'danger'} />
                {a.dueDate && <Badge variant={a.status === 'ASSIGNED' && isOverdue(a.dueDate) ? 'destructive' : 'secondary'}>Due {formatDate(a.dueDate)}</Badge>}
              </span>
            }
          />
          <Alert className="mb-6">
            <EyeOff className="size-4" />
            <AlertTitle>Double-blind review</AlertTitle>
            <AlertDescription>Author identities are hidden. The manuscript you download has author-identifying document properties removed. Do not attempt to identify the authors; report any identity leak to the editor.</AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader><CardTitle>Manuscript</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <KeyValue items={[{ label: 'Subject area', value: a.article.subjectArea?.name }, { label: 'Version', value: a.version.versionNumber }, { label: 'Word count', value: a.version.wordCount.toLocaleString() }, { label: 'Assigned', value: formatDate(a.assignedAt) }]} />
                  <div className="flex flex-wrap gap-1">{a.article.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
                  <DownloadButton fileId={a.version.fileId} variant="default" size="default" fallbackName="manuscript.docx">Download manuscript</DownloadButton>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Abstract</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-wrap text-sm">{a.article.abstract}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Ethics statement</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-wrap text-sm">{a.article.ethicsStatement}</p></CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              {a.status === 'SUBMITTED' && a.report ? <SubmittedReview a={a} /> : a.canSubmit ? <ReviewForm key={a.report?.id ?? 'new'} a={a} queryKey={key} /> : <NotOpen a={a} />}
            </div>
          </div>
        </>
      )}
    </QueryBoundary>
  );
}

function NotOpen({ a }: { a: AssignmentDetail }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {a.status === 'DECLINED' ? 'You declined this assignment.' : a.status === 'ASSIGNED' ? 'This review can no longer be submitted because the article is no longer under review.' : 'This assignment is closed.'}
        </p>
      </CardContent>
    </Card>
  );
}

function SubmittedReview({ a }: { a: AssignmentDetail }) {
  const r = a.report!;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Lock className="size-5" /> Your submitted review</CardTitle>
        <CardDescription>Submitted {formatDateTime(r.submittedAt)}. Reviews are locked once submitted and go to the Editor first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">Recommendation: <Badge variant="secondary">{recommendationLabel(r.recommendation)}</Badge></p>
        {r.comments.map((c) => (
          <div key={c.id} className="rounded-lg border p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{sectionLabel(c.section)}</p>
            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReviewForm({ a, queryKey }: { a: AssignmentDetail; queryKey: string[] }) {
  const router = useRouter();
  const [sections, setSections] = useState<Sections>(() => {
    const s: Sections = {};
    for (const c of a.report?.comments ?? []) s[c.section] = s[c.section] ? `${s[c.section]}

${c.body}` : c.body;
    return s;
  });
  const [rec, setRec] = useState<string>(a.report?.recommendation ?? '');
  const [errors, setErrors] = useState<{ rec?: string; comments?: string }>({});
  const [declining, setDeclining] = useState(false);

  const comments = COMMENT_SECTIONS.map((s) => ({ section: s.value, body: (sections[s.value] ?? '').trim() })).filter((c) => c.body);
  const invalidate = [queryKey, ['reviewer', 'assignments'], ['reviewer', 'dashboard'], ['reviewer', 'history']];

  const draft = useAction({ fn: () => api.put(`/reviewer/assignments/${a.id}/review`, { recommendation: rec || undefined, comments }), invalidate: [queryKey] });
  const submit = useAction({ fn: () => api.post(`/reviewer/assignments/${a.id}/review/submit`, { recommendation: rec, comments }), invalidate });

  function validate(): boolean {
    const e: typeof errors = {};
    if (!rec) e.rec = 'Choose a recommendation.';
    if (!comments.some((c) => c.section !== 'CONFIDENTIAL_TO_EDITOR')) e.comments = 'Add at least one comment that is not marked confidential to the editor.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review form</CardTitle>
        <CardDescription>Your comments go to the Editor first, who decides what is shared with the author. Save a draft any time; submitting locks the review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field data-invalid={!!errors.rec}>
          <FieldLabel>Recommendation <span className="text-destructive">*</span></FieldLabel>
          <RadioGroup value={rec} onValueChange={(v) => { setRec(v); setErrors((e) => ({ ...e, rec: undefined })); }} className="grid gap-2 sm:grid-cols-2">
            {RECOMMENDATIONS.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5">
                <RadioGroupItem value={r.value} /> {r.label}
              </label>
            ))}
          </RadioGroup>
          <FieldDescription>Your recommendation supports, but does not replace, the Editor’s decision.</FieldDescription>
          {errors.rec && <FieldError>{errors.rec}</FieldError>}
        </Field>

        {COMMENT_SECTIONS.map((s) => (
          <Field key={s.value}>
            <FieldLabel htmlFor={`sec-${s.value}`}>
              {s.label}
              {s.value === 'CONFIDENTIAL_TO_EDITOR' && <Badge variant="outline" className="ml-2">Never shown to authors</Badge>}
            </FieldLabel>
            <Textarea id={`sec-${s.value}`} rows={s.value === 'SUMMARY' ? 6 : 3} maxLength={10000} value={sections[s.value] ?? ''} onChange={(e) => { setSections((x) => ({ ...x, [s.value]: e.target.value })); setErrors((er) => ({ ...er, comments: undefined })); }} />
          </Field>
        ))}
        {errors.comments && <FieldError>{errors.comments}</FieldError>}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <LoadingButton variant="outline" loading={draft.isPending} disabled={submit.isPending} onClick={() => draft.mutate()}><Save className="size-4" /> Save draft</LoadingButton>
          <ConfirmDialog
            title="Submit your review?"
            description="Once submitted, your review is timestamped and locked. It cannot be edited afterwards."
            confirmLabel="Submit review"
            disabled={submit.isPending}
            onConfirm={async () => { if (!validate()) throw new Error('invalid'); await submit.mutateAsync(); router.push('/reviewer/assignments'); }}
            trigger={<LoadingButton loading={submit.isPending} disabled={draft.isPending}><Send className="size-4" /> Submit review…</LoadingButton>}
          />
          <Button variant="ghost" className="ml-auto text-destructive" onClick={() => setDeclining(true)}><ThumbsDown className="size-4" /> Decline assignment</Button>
        </div>
      </CardContent>
      {declining && <DeclineDialog assignmentId={a.id} onClose={() => setDeclining(false)} onDone={() => router.push('/reviewer/assignments')} />}
    </Card>
  );
}

function DeclineDialog({ assignmentId, onClose, onDone }: { assignmentId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const decline = useAction({ fn: () => api.post(`/reviewer/assignments/${assignmentId}/decline`, { reason: reason.trim() }), invalidate: [['reviewer']], onSuccess: onDone });
  return (
    <Dialog open onOpenChange={(o) => !o && !decline.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this assignment</DialogTitle>
          <DialogDescription>The editor will be told and will assign another reviewer. Please give a short reason (e.g. conflict of interest, availability).</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <Textarea id="reason" rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={decline.isPending}>Cancel</Button>
          <LoadingButton variant="destructive" loading={decline.isPending} disabled={reason.trim().length < 5} onClick={() => decline.mutate()}>Decline</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

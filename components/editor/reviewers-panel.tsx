'use client';

import { FieldValidation } from '@/components/forms/field-validation';
import { replaceReasonSchema, reviewDueDateSchema } from '@/lib/schemas/editorial';
import { firstError } from '@/lib/validation';
import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AlertTriangle, BellRing, CheckCircle2, Repeat, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';
import type { EditorArticleDetail, EditorReviewRow, EligibilityResult, ReviewerProfileRow, SubjectArea } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/shared/loading-button';
import { EnumBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/states';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { refreshArticle } from './keys';

const ALL = '__all__';
const TONE = { ASSIGNED: 'warning', SUBMITTED: 'success', DECLINED: 'danger', REVOKED: 'neutral' } as const;

export function ReviewersPanel({ article }: { article: EditorArticleDetail }) {
  const id = article.id;
  const [assignOpen, setAssignOpen] = useState(false);
  const [replacing, setReplacing] = useState<EditorReviewRow | null>(null);
  const remind = useAction({ fn: (assignmentId: string) => api.post(`/editorial/articles/${id}/reviewers/${assignmentId}/remind`), invalidate: refreshArticle(id) });

  const live = article.reviews.filter((r) => r.status === 'ASSIGNED' || r.status === 'SUBMITTED');
  const canAssign = article.status === 'READY_FOR_REVIEWER_ASSIGNMENT';
  const underReview = article.status === 'UNDER_REVIEW';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="size-5" /> Reviewers</CardTitle>
        <CardDescription>Assign exactly two reviewers manually (no automatic allocation). Reviewer identities are visible to editorial staff only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {article.reviews.length === 0 ? (
          <EmptyState title="No reviewers assigned" description={canAssign ? 'Choose two reviewers from the approved pool.' : 'Reviewer assignment opens after the plagiarism check is cleared.'} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {article.reviews.map((r) => (
              <li key={r.assignmentId} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.label}</span>
                    <EnumBadge value={r.status} tone={TONE[r.status]} />
                    {r.status === 'ASSIGNED' && isOverdue(r.dueDate) && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                  <p>{r.reviewer.name} <span className="font-mono text-xs text-muted-foreground">({r.reviewer.reviewerCode})</span></p>
                  <p className="text-xs text-muted-foreground">{r.reviewer.email}{r.reviewer.institution ? ` · ${r.reviewer.institution}` : ''}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {formatDate(r.assignedAt)}{r.dueDate ? ` · due ${formatDate(r.dueDate)}` : ''}{r.report ? ` · submitted ${formatDateTime(r.report.submittedAt)}` : ''}
                  </p>
                  {r.declineReason && <p className="text-xs text-destructive">Declined: {r.declineReason}</p>}
                </div>
                {underReview && (r.status === 'ASSIGNED' || r.status === 'DECLINED') && (
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'ASSIGNED' && (
                      <Button variant="outline" size="sm" disabled={remind.isPending} onClick={() => remind.mutate(r.assignmentId)}>
                        <BellRing className="size-3.5" /> Remind
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setReplacing(r)}>
                      <Repeat className="size-3.5" /> Replace
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {underReview && live.length < 2 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>Only {live.length} of 2 reviewers are active. Replace the declined reviewer so both reviews can be completed.</AlertDescription>
          </Alert>
        )}

        {canAssign && (
          <Button onClick={() => setAssignOpen(true)}><Users className="size-4" /> Assign two reviewers</Button>
        )}
      </CardContent>
      {assignOpen && <AssignDialog article={article} onClose={() => setAssignOpen(false)} />}
      {replacing && <ReplaceDialog article={article} row={replacing} onClose={() => setReplacing(null)} />}
    </Card>
  );
}

// ───────────────────────────── pool picker ─────────────────────────────

function ReviewerPicker({ article, selected, max, onChange, excludeIds = [] }: { article: EditorArticleDetail; selected: string[]; max: number; onChange: (ids: string[]) => void; excludeIds?: string[] }) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState<string>(article.subjectArea?.id ?? '');
  const q = useDebounce(search);
  const areas = useQuery({ queryKey: ['subject-areas'], queryFn: async () => (await api.get<SubjectArea[]>('/subject-areas')).data });
  const pool = useQuery({
    queryKey: ['editor', 'reviewers', 'picker', q, area],
    queryFn: async () => (await api.get<ReviewerProfileRow[]>('/editorial/reviewers', { isActive: 'true', search: q, subjectAreaId: area, pageSize: 50 })).data,
  });
  const eligibility = useQueries({
    queries: selected.map((rid) => ({
      queryKey: ['editor', 'eligibility', article.id, rid],
      queryFn: async () => (await api.get<EligibilityResult>(`/editorial/articles/${article.id}/reviewers/${rid}/eligibility`)).data,
    })),
  });
  const rows = (pool.data ?? []).filter((r) => !excludeIds.includes(r.id));

  function toggle(rid: string, on: boolean) {
    if (on) onChange(max === 1 ? [rid] : selected.length < max ? [...selected, rid] : selected);
    else onChange(selected.filter((x) => x !== rid));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search name, Reviewer ID, institution" aria-label="Search reviewers" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={area || ALL} onValueChange={(v) => setArea(v === ALL ? '' : v)}>
          <SelectTrigger className="sm:w-60" aria-label="Subject area"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subject areas</SelectItem>
            {(areas.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border">
        {pool.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading reviewers…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No active reviewers match. Try clearing the subject-area filter.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const on = selected.includes(r.id);
              const full = !on && selected.length >= max && max > 1;
              return (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
                    <Checkbox checked={on} disabled={full} onCheckedChange={(c) => toggle(r.id, c === true)} aria-label={`Select ${r.user.firstName} ${r.user.lastName}`} className="mt-1" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{r.user.firstName} {r.user.lastName}</span> <span className="font-mono text-xs text-muted-foreground">{r.reviewerCode}</span>
                      <span className="block text-xs text-muted-foreground">{r.institution ?? '—'} · {r.highestQualification ?? '—'} · {r.yearsTeaching} yrs teaching · {r.activeAssignments} open</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {r.subjectAreas.map((s) => <Badge key={s.id} variant={s.id === article.subjectArea?.id ? 'default' : 'secondary'}>{s.name}</Badge>)}
                        {!r.meetsProposedEligibility && <Badge variant="outline" className="border-amber-400 text-amber-700">Below proposed eligibility</Badge>}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          {eligibility.map((e, i) => {
            const pick = pool.data?.find((r) => r.id === selected[i]);
            const name = pick ? `${pick.user.firstName} ${pick.user.lastName}` : selected[i];
            if (e.isLoading) return <p key={selected[i]} className="text-xs text-muted-foreground">Checking {name}…</p>;
            if (e.isError || !e.data) return <p key={selected[i]} className="text-xs text-destructive">Could not check {name}.</p>;
            const d = e.data;
            return (
              <Alert key={d.reviewerId} variant={d.canBeAssigned ? 'default' : 'destructive'}>
                {d.canBeAssigned ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                <AlertDescription>
                  <strong>{name}</strong> ({d.reviewerCode}): {d.canBeAssigned ? 'no conflicts' : d.blockers.join('; ')}.
                  {' '}{d.subjectAreaMatch ? 'Subject area matches.' : 'Subject area does not match the article.'} {d.currentOpenAssignments} open assignment(s).
                  {!d.meetsProposedEligibility && ' Below the proposed eligibility criteria (editor’s discretion).'}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useEligible(articleId: string, ids: string[]) {
  const res = useQueries({ queries: ids.map((rid) => ({ queryKey: ['editor', 'eligibility', articleId, rid], queryFn: async () => (await api.get<EligibilityResult>(`/editorial/articles/${articleId}/reviewers/${rid}/eligibility`)).data })) });
  return { blocked: res.some((r) => r.data && !r.data.canBeAssigned), loading: res.some((r) => r.isLoading) };
}

function AssignDialog({ article, onClose }: { article: EditorArticleDetail; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [due, setDue] = useState('');
  const { blocked, loading } = useEligible(article.id, selected);
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const assign = useAction({
    fn: () => api.post(`/editorial/articles/${article.id}/reviewers`, { reviewerIds: selected, dueDate: due ? new Date(`${due}T23:59:59`).toISOString() : undefined }),
    invalidate: refreshArticle(article.id),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !assign.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign two reviewers</DialogTitle>
          <DialogDescription>Select exactly two. Reviewers are notified immediately and will see an anonymised manuscript.</DialogDescription>
        </DialogHeader>
        <ReviewerPicker article={article} selected={selected} max={2} onChange={setSelected} />
        <Field>
          <FieldLabel htmlFor="due">Review due date (optional)</FieldLabel>
          <Input id="due" type="date" min={minDate} value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-56" aria-invalid={!!firstError(reviewDueDateSchema(minDate), due)} />
          <FieldValidation schema={reviewDueDateSchema(minDate)} value={due} />
        </Field>
        <DialogFooter className="items-center">
          <span className="mr-auto text-sm text-muted-foreground">{selected.length} of 2 selected</span>
          <Button variant="ghost" onClick={onClose} disabled={assign.isPending}>Cancel</Button>
          <LoadingButton loading={assign.isPending} disabled={selected.length !== 2 || blocked || loading || !!firstError(reviewDueDateSchema(minDate), due)} onClick={() => assign.mutate()}>Assign reviewers</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceDialog({ article, row, onClose }: { article: EditorArticleDetail; row: EditorReviewRow; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const { blocked, loading } = useEligible(article.id, selected);
  const exclude = article.reviews.map((r) => r.reviewer.id);
  const replace = useAction({
    fn: () => api.post(`/editorial/articles/${article.id}/reviewers/${row.assignmentId}/replace`, { reviewerId: selected[0], reason: reason || undefined }),
    invalidate: refreshArticle(article.id),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !replace.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replace {row.label}</DialogTitle>
          <DialogDescription>Replacing {row.reviewer.name} ({row.reviewer.reviewerCode}). Reviewers who already had an assignment on this article cannot be re-selected.</DialogDescription>
        </DialogHeader>
        <ReviewerPicker article={article} selected={selected} max={1} onChange={setSelected} excludeIds={exclude} />
        <Field>
          <FieldLabel htmlFor="reason">Reason (optional)</FieldLabel>
          <Textarea id="reason" rows={2} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          <FieldValidation schema={replaceReasonSchema} value={reason} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={replace.isPending}>Cancel</Button>
          <LoadingButton loading={replace.isPending} disabled={selected.length !== 1 || blocked || loading || !!firstError(replaceReasonSchema, reason)} onClick={() => replace.mutate()}>Replace reviewer</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

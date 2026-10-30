'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { manualPlagiarismSchema as manualSchema, notesSchema, type ManualPlagiarismValues as ManualValues, type NotesValues } from '@/lib/schemas/editorial';
import { CheckCircle2, FileSearch, PlayCircle, ScanSearch, Send, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import type { EditorArticleDetail, PlagiarismCheck } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField, TextField, TextareaField } from '@/components/forms/fields';
import { DownloadButton } from '@/components/shared/download-button';
import { FileInput } from '@/components/shared/file-input';
import { LoadingButton } from '@/components/shared/loading-button';
import { EnumBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/states';
import { refreshArticle } from './keys';


export function ScreeningPanel({ article }: { article: EditorArticleDetail }) {
  const id = article.id;
  const invalidate = refreshArticle(id);
  const start = useAction({ fn: () => api.post(`/editorial/articles/${id}/screening/start`), invalidate });
  const [decision, setDecision] = useState<'PROCEED' | 'REJECT' | null>(null);

  const s = article.status;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSearch className="size-5" /> Initial editorial screening</CardTitle>
        <CardDescription>Every submission is screened first. A manuscript rejected here is closed and cannot be resubmitted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {s === 'SUBMITTED' && (
          <>
            <p className="text-sm text-muted-foreground">This manuscript is waiting in the screening queue. Starting screening assigns it to you.</p>
            <LoadingButton loading={start.isPending} onClick={() => start.mutate()}><PlayCircle className="size-4" /> Start screening</LoadingButton>
          </>
        )}
        {s === 'UNDER_EDITORIAL_SCREENING' && (
          <>
            <p className="text-sm text-muted-foreground">Review the manuscript and decide whether it proceeds to the plagiarism check and peer review.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDecision('PROCEED')}><CheckCircle2 className="size-4" /> Proceed to plagiarism check</Button>
              <Button variant="destructive" onClick={() => setDecision('REJECT')}><XCircle className="size-4" /> Reject at screening</Button>
            </div>
          </>
        )}
        {s !== 'SUBMITTED' && s !== 'UNDER_EDITORIAL_SCREENING' && (
          <p className="text-sm text-muted-foreground">
            {article.screeningRejected ? 'Rejected at screening — this submission is closed.' : 'Screening is complete for this manuscript.'}
          </p>
        )}
      </CardContent>
      {decision && <ScreeningDecisionDialog articleId={id} decision={decision} onClose={() => setDecision(null)} />}
    </Card>
  );
}

function ScreeningDecisionDialog({ articleId, decision, onClose }: { articleId: string; decision: 'PROCEED' | 'REJECT'; onClose: () => void }) {
  const form = useForm<NotesValues>({ resolver: zodResolver(notesSchema), defaultValues: { notes: '', authorMessage: '' } });
  const reject = decision === 'REJECT';
  const submit = useAction({
    fn: (v: NotesValues) => api.post(`/editorial/articles/${articleId}/screening/decision`, { decision, notes: v.notes || undefined, authorMessage: reject ? v.authorMessage || undefined : undefined }),
    form,
    invalidate: refreshArticle(articleId),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reject ? 'Reject at screening' : 'Proceed to plagiarism check'}</DialogTitle>
          <DialogDescription>{reject ? 'The submission will be closed permanently and the author notified. This cannot be undone.' : 'The manuscript moves to the plagiarism check, which must be completed before reviewers can be assigned.'}</DialogDescription>
        </DialogHeader>
        <form id="screening-form" onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4" noValidate>
          <TextareaField form={form} name="notes" label="Internal notes" description="Visible to editors only." rows={3} />
          {reject && <TextareaField form={form} name="authorMessage" label="Message to the author (optional)" rows={3} />}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <LoadingButton type="submit" form="screening-form" variant={reject ? 'destructive' : 'default'} loading={submit.isPending}>{reject ? 'Reject submission' : 'Proceed'}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── plagiarism ─────────────────────────────


const VERDICTS = [{ value: 'CLEAR', label: 'Clear – acceptable' }, { value: 'CONCERN', label: 'Concern – needs attention' }];

export function PlagiarismPanel({ article }: { article: EditorArticleDetail }) {
  const id = article.id;
  const invalidate = refreshArticle(id);
  const active = article.status === 'PLAGIARISM_CHECK';
  const [manualOpen, setManualOpen] = useState(false);
  const [clearance, setClearance] = useState<'CLEAR' | 'REJECT' | null>(null);

  const initiate = useAction({ fn: () => api.post(`/editorial/articles/${id}/plagiarism/initiate`), invalidate });
  const latest = article.plagiarismChecks[0];
  const hasClearCheck = article.plagiarismChecks.some((c) => c.status === 'COMPLETED' && c.verdict === 'CLEAR');
  const hasCompleted = article.plagiarismChecks.some((c) => c.status === 'COMPLETED');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScanSearch className="size-5" /> Plagiarism check</CardTitle>
        <CardDescription>The check must be completed and cleared before reviewers can see the manuscript. If the provider API is unavailable, record the result manually.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {article.plagiarismChecks.length === 0 ? (
          <EmptyState title="No plagiarism check recorded" description={active ? 'Initiate a check through the provider, or record a result manually.' : 'Checks become available once the manuscript passes screening.'} />
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {article.plagiarismChecks.map((c) => (
              <CheckRow key={c.id} check={c} articleId={id} canSetVerdict={active} />
            ))}
          </ul>
        )}

        {active && (
          <>
            <div className="flex flex-wrap gap-2">
              <LoadingButton variant="outline" loading={initiate.isPending} onClick={() => initiate.mutate()} disabled={latest?.status === 'IN_PROGRESS' || latest?.status === 'PENDING'}>
                <Send className="size-4" /> Check via provider
              </LoadingButton>
              <Button variant="outline" onClick={() => setManualOpen(true)}>Record result manually</Button>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={!hasClearCheck} onClick={() => setClearance('CLEAR')}><CheckCircle2 className="size-4" /> Clear for reviewer assignment</Button>
              <Button variant="destructive" disabled={!hasCompleted} onClick={() => setClearance('REJECT')}><XCircle className="size-4" /> Reject</Button>
            </div>
            {!hasClearCheck && <Alert><AlertDescription>Clearing requires a completed check whose verdict is “Clear”.</AlertDescription></Alert>}
          </>
        )}
      </CardContent>
      {manualOpen && <ManualCheckDialog articleId={id} onClose={() => setManualOpen(false)} />}
      {clearance && <ClearanceDialog articleId={id} action={clearance} onClose={() => setClearance(null)} />}
    </Card>
  );
}

function CheckRow({ check: c, articleId, canSetVerdict }: { check: PlagiarismCheck; articleId: string; canSetVerdict: boolean }) {
  const setVerdict = useAction({
    fn: (verdict: 'CLEAR' | 'CONCERN') => api.put(`/editorial/articles/${articleId}/plagiarism/${c.id}/verdict`, { verdict }),
    invalidate: refreshArticle(articleId),
  });
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <EnumBadge value={c.status} tone={c.status === 'COMPLETED' ? 'success' : c.status === 'FAILED' ? 'danger' : 'info'} />
          <EnumBadge value={c.source} />
          {c.verdict && <EnumBadge value={c.verdict} tone={c.verdict === 'CLEAR' ? 'success' : 'danger'} />}
          {c.similarityScore !== null && <span className="font-medium tabular-nums">{Number(c.similarityScore).toFixed(2)}% similarity</span>}
        </div>
        <p className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}{c.provider ? ` · ${c.provider}` : ''}{c.notes ? ` · ${c.notes}` : ''}</p>
        {c.errorMessage && <p className="text-xs text-destructive">{c.errorMessage}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {c.reportFileId && <DownloadButton fileId={c.reportFileId}>Report</DownloadButton>}
        {canSetVerdict && c.status === 'COMPLETED' && !c.verdict && (
          <>
            <Button size="sm" variant="outline" disabled={setVerdict.isPending} onClick={() => setVerdict.mutate('CLEAR')}>Mark clear</Button>
            <Button size="sm" variant="outline" disabled={setVerdict.isPending} onClick={() => setVerdict.mutate('CONCERN')}>Mark concern</Button>
          </>
        )}
      </div>
    </li>
  );
}

function ManualCheckDialog({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  const [report, setReport] = useState<File | null>(null);
  const form = useForm<ManualValues>({ resolver: zodResolver(manualSchema), defaultValues: { similarityScore: 0, verdict: undefined, provider: '', providerReference: '', notes: '' } });
  const submit = useAction({
    fn: (v: ManualValues) => {
      const fd = new FormData();
      fd.append('similarityScore', String(v.similarityScore));
      fd.append('verdict', v.verdict);
      for (const k of ['provider', 'providerReference', 'notes'] as const) if (v[k]) fd.append(k, v[k]!);
      if (report) fd.append('report', report);
      return api.upload('POST', `/editorial/articles/${articleId}/plagiarism/record`, fd);
    },
    form,
    invalidate: refreshArticle(articleId),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record plagiarism result</DialogTitle>
          <DialogDescription>Enter the result from your plagiarism service and optionally attach the report (PDF, Word or HTML).</DialogDescription>
        </DialogHeader>
        <form id="manual-check" onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="similarityScore" label="Similarity (%)" type="number" step="0.01" min={0} max={100} required />
            <SelectField form={form} name="verdict" label="Verdict" options={VERDICTS} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="provider" label="Service" placeholder="e.g. provider name" />
            <TextField form={form} name="providerReference" label="Report reference" />
          </div>
          <TextareaField form={form} name="notes" label="Notes" rows={3} />
          <FileInput label="Report file (optional)" accept=".pdf,.docx,.html" value={report} onChange={setReport} />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <LoadingButton type="submit" form="manual-check" loading={submit.isPending}>Save result</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClearanceDialog({ articleId, action, onClose }: { articleId: string; action: 'CLEAR' | 'REJECT'; onClose: () => void }) {
  const form = useForm<NotesValues>({ resolver: zodResolver(notesSchema), defaultValues: { notes: '', authorMessage: '' } });
  const reject = action === 'REJECT';
  const submit = useAction({
    fn: (v: NotesValues) => api.post(`/editorial/articles/${articleId}/plagiarism/clearance`, { action, notes: v.notes || undefined, authorMessage: reject ? v.authorMessage || undefined : undefined }),
    form,
    invalidate: refreshArticle(articleId),
    onSuccess: onClose,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reject ? 'Reject after plagiarism check' : 'Clear for reviewer assignment'}</DialogTitle>
          <DialogDescription>{reject ? 'The article will be rejected and the author notified.' : 'The manuscript will be ready for you to assign exactly two reviewers.'}</DialogDescription>
        </DialogHeader>
        <form id="clearance-form" onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4" noValidate>
          <TextareaField form={form} name="notes" label="Internal notes" rows={3} />
          {reject && <TextareaField form={form} name="authorMessage" label="Message to the author (optional)" rows={3} />}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <LoadingButton type="submit" form="clearance-form" variant={reject ? 'destructive' : 'default'} loading={submit.isPending}>{reject ? 'Reject article' : 'Clear for review'}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

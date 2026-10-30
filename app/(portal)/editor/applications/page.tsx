'use client';

import { FieldValidation } from '@/components/forms/field-validation';
import { decisionNoteSchema } from '@/lib/schemas/editorial';
import { firstError } from '@/lib/validation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate } from '@/lib/format';
import { useListState } from '@/hooks/use-list-state';
import type { ReviewerApplicationRow } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DownloadButton } from '@/components/shared/download-button';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { ToneBadge } from '@/components/shared/status-badge';
import { KeyValue } from '@/components/shared/stat-card';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';

const DEFAULTS = { page: '1', search: '', status: 'PENDING' };
const TONE = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as const;

export default function ReviewerApplicationsPage() {
  const { state, set, page } = useListState(DEFAULTS);
  const [open, setOpen] = useState<ReviewerApplicationRow | null>(null);
  const q = useQuery({
    queryKey: ['editor', 'applications', state],
    queryFn: () => api.get<ReviewerApplicationRow[]>('/editorial/reviewer-applications', { page, pageSize: 20, search: state.search, status: state.status === 'ALL' ? undefined : state.status }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<ReviewerApplicationRow>[] = [
    {
      key: 'name',
      header: 'Applicant',
      className: 'min-w-48',
      cell: (a) => (
        <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpen(a)}>
          {a.firstName} {a.lastName}
          <span className="block text-xs font-normal text-muted-foreground">{a.email}</span>
        </button>
      ),
    },
    { key: 'inst', header: 'Institution', cell: (a) => a.institution },
    { key: 'qual', header: 'Qualification', cell: (a) => <span>{a.highestQualification}<span className="block text-xs text-muted-foreground">{a.yearsTeaching} yrs{a.holdsMPharm ? ' · M.Pharm' : ''}</span></span> },
    { key: 'areas', header: 'Subject areas', cell: (a) => <span className="flex flex-wrap gap-1">{a.subjectAreas.map((s) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}</span> },
    { key: 'elig', header: 'Proposed criteria', cell: (a) => <ToneBadge tone={a.meetsProposedEligibility ? 'success' : 'warning'}>{a.meetsProposedEligibility ? 'Met' : 'Not met'}</ToneBadge> },
    { key: 'status', header: 'Status', cell: (a) => <ToneBadge tone={TONE[a.status]}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</ToneBadge> },
    { key: 'date', header: 'Applied', cell: (a) => formatDate(a.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Reviewer applications" description="Approving creates the reviewer account, issues a unique Reviewer ID and emails an invitation." />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search name or email"
        filters={[{ key: 'status', label: 'Status', value: state.status, onChange: (v) => set({ status: v || 'ALL' }), options: [{ value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }] }]}
      />
      <DataTable columns={columns} rows={q.data?.data} getKey={(a) => a.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty={{ title: 'No applications', description: 'New applications from prospective reviewers appear here.' }} />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
      {open && <ApplicationDialog app={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ApplicationDialog({ app, onClose }: { app: ReviewerApplicationRow; onClose: () => void }) {
  const [note, setNote] = useState('');
  const invalidate = [['editor', 'applications'], ['editor', 'dashboard'], ['editor', 'reviewers']];
  const approve = useAction({ fn: () => api.post<{ reviewerCode: string; inviteEmailSent: boolean }>(`/editorial/reviewer-applications/${app.id}/approve`, { note: note || undefined }), invalidate, success: false });
  const reject = useAction({ fn: () => api.post(`/editorial/reviewer-applications/${app.id}/reject`, { note: note || undefined }), invalidate, onSuccess: onClose });
  const busy = approve.isPending || reject.isPending;
  const [result, setResult] = useState<{ reviewerCode: string; inviteEmailSent: boolean } | null>(null);

  if (result) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reviewer approved</DialogTitle><DialogDescription>Reviewer ID <span className="font-mono font-semibold">{result.reviewerCode}</span> was issued.</DialogDescription></DialogHeader>
          {!result.inviteEmailSent && <Alert variant="destructive"><AlertDescription>The invitation email could not be sent. Re-send it from Admin → Users.</AlertDescription></Alert>}
          <DialogFooter><Button onClick={onClose}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{app.firstName} {app.lastName}</DialogTitle>
          <DialogDescription>{app.email} · applied {formatDate(app.createdAt)}</DialogDescription>
        </DialogHeader>
        <KeyValue
          items={[
            { label: 'Institution', value: app.institution },
            { label: 'Designation', value: app.designation },
            { label: 'Highest qualification', value: app.highestQualification },
            { label: 'M.Pharm', value: app.holdsMPharm ? 'Yes' : 'No' },
            { label: 'Years teaching', value: app.yearsTeaching },
            { label: 'Proposed criteria', value: <ToneBadge tone={app.meetsProposedEligibility ? 'success' : 'warning'}>{app.meetsProposedEligibility ? 'Met' : 'Not met'}</ToneBadge> },
          ]}
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject areas</p>
          <div className="mt-1 flex flex-wrap gap-1">{app.subjectAreas.map((s) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}</div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Statement</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{app.statement}</p>
        </div>
        {app.cvFileId && <DownloadButton fileId={app.cvFileId}>Download CV</DownloadButton>}
        {app.status === 'PENDING' ? (
          <>
            <Field>
              <FieldLabel htmlFor="note">Decision note (optional)</FieldLabel>
              <Textarea id="note" rows={3} maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} />
              <FieldValidation schema={decisionNoteSchema} value={note} />
            </Field>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={busy}>Close</Button>
              <LoadingButton variant="destructive" loading={reject.isPending} disabled={busy || !!firstError(decisionNoteSchema, note)} onClick={() => reject.mutate()}><X className="size-4" /> Reject</LoadingButton>
              <LoadingButton loading={approve.isPending} disabled={busy || !!firstError(decisionNoteSchema, note)} onClick={async () => { try { setResult(await approve.mutateAsync().then((r) => r.data)); } catch { /* toast shown */ } }}><Check className="size-4" /> Approve &amp; issue Reviewer ID</LoadingButton>
            </DialogFooter>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Decided {formatDate(app.reviewedAt)}{app.reviewedBy ? ` by ${app.reviewedBy.firstName} ${app.reviewedBy.lastName}` : ''}.{app.decisionNote ? ` Note: ${app.decisionNote}` : ''}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

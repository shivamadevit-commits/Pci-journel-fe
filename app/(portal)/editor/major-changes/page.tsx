'use client';

import { FieldValidation } from '@/components/forms/field-validation';
import { decisionNoteSchema } from '@/lib/schemas/editorial';
import { firstError } from '@/lib/validation';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import { useListState } from '@/hooks/use-list-state';
import type { MajorChangeRow } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { EnumBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';

const DEFAULTS = { page: '1', pending: 'true' };

export default function MajorChangesPage() {
  const { state, set, page } = useListState(DEFAULTS);
  const [deciding, setDeciding] = useState<{ row: MajorChangeRow; decision: 'APPROVE' | 'REJECT' } | null>(null);
  const q = useQuery({
    queryKey: ['editor', 'major-changes', state],
    queryFn: () => api.get<MajorChangeRow[]>('/editorial/major-changes', { page, pageSize: 20, pending: state.pending }),
    placeholderData: (prev) => prev,
  });

  const pending = state.pending !== 'false';
  const columns: Column<MajorChangeRow>[] = [
    { key: 'article', header: 'Article', className: 'min-w-56', cell: (r) => <Link href={`/editor/articles/${r.article.id}`} className="font-medium hover:underline">{r.article.title}<span className="block font-mono text-xs font-normal text-muted-foreground">{r.article.submissionId}</span></Link> },
    { key: 'desc', header: 'Requested change', className: 'min-w-72', cell: (r) => <span><span className="whitespace-pre-wrap">{r.description}</span>{r.location && <span className="block text-xs text-muted-foreground">Location: {r.location}</span>}{r.productionNote && <span className="block text-xs text-muted-foreground">Production: {r.productionNote}</span>}</span> },
    { key: 'esc', header: 'Escalated', cell: (r) => formatDateTime(r.escalatedAt) },
    { key: 'status', header: 'Status', cell: (r) => <EnumBadge value={r.status} tone={r.status === 'ESCALATED' ? 'warning' : r.status === 'APPROVED_BY_EDITOR' || r.status === 'IMPLEMENTED' ? 'success' : 'danger'} /> },
    {
      key: 'act',
      header: '',
      cell: (r) =>
        r.status === 'ESCALATED' ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setDeciding({ row: r, decision: 'APPROVE' })}><Check className="size-3.5" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => setDeciding({ row: r, decision: 'REJECT' })}><X className="size-3.5" /> Reject</Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{r.editorNote ?? ''}</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Major content changes" description="Production is paused on these articles until you approve or reject each change (BR-019)." />
      <Tabs value={pending ? 'pending' : 'decided'} onValueChange={(v) => set({ pending: v === 'pending' ? 'true' : 'false' })} className="mb-4">
        <TabsList><TabsTrigger value="pending">Awaiting decision</TabsTrigger><TabsTrigger value="decided">Decided</TabsTrigger></TabsList>
      </Tabs>
      <DataTable columns={columns} rows={q.data?.data} getKey={(r) => r.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty={{ title: pending ? 'Nothing awaiting your decision' : 'No decided changes yet' }} />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
      {deciding && <DecisionDialog {...deciding} onClose={() => setDeciding(null)} />}
    </>
  );
}

function DecisionDialog({ row, decision, onClose }: { row: MajorChangeRow; decision: 'APPROVE' | 'REJECT'; onClose: () => void }) {
  const [note, setNote] = useState('');
  const submit = useAction({
    fn: () => api.post(`/editorial/major-changes/${row.id}/decision`, { decision, note: note || undefined }),
    invalidate: [['editor', 'major-changes'], ['editor', 'dashboard'], ['editor', 'article', row.article.id]],
    onSuccess: onClose,
  });
  const approve = decision === 'APPROVE';
  return (
    <Dialog open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approve ? 'Approve' : 'Reject'} major content change</DialogTitle>
          <DialogDescription>{row.article.submissionId} — {row.description}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="note">Note for production (optional)</FieldLabel>
          <Textarea id="note" rows={3} maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} />
          <FieldValidation schema={decisionNoteSchema} value={note} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <LoadingButton variant={approve ? 'default' : 'destructive'} loading={submit.isPending} disabled={!!firstError(decisionNoteSchema, note)} onClick={() => submit.mutate()}>{approve ? 'Approve change' : 'Reject change'}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

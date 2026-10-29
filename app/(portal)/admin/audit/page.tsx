'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { formatDateTime } from '@/lib/format';
import { useListState } from '@/hooks/use-list-state';
import type { AuditRow } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';

const DEFAULTS = { page: '1', action: '', entityType: '', entityId: '', from: '', to: '' };

export default function AuditPage() {
  const { state, set, reset, page } = useListState(DEFAULTS);
  const [open, setOpen] = useState<AuditRow | null>(null);
  const [draft, setDraft] = useState({ action: state.action, entityType: state.entityType, entityId: state.entityId, from: state.from, to: state.to });

  const q = useQuery({
    queryKey: ['admin', 'audit', state],
    queryFn: () =>
      api.get<AuditRow[]>('/admin/audit-logs', {
        page,
        pageSize: 30,
        action: state.action,
        entityType: state.entityType,
        entityId: state.entityId,
        from: state.from ? new Date(`${state.from}T00:00:00`).toISOString() : undefined,
        to: state.to ? new Date(`${state.to}T23:59:59`).toISOString() : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<AuditRow>[] = [
    { key: 'time', header: 'Time', cell: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</span> },
    { key: 'action', header: 'Event', cell: (r) => <button type="button" className="text-left font-mono text-xs hover:underline" onClick={() => setOpen(r)}>{r.action}</button> },
    { key: 'actor', header: 'Actor', cell: (r) => (r.actor ? <span>{r.actor.name}<span className="block text-xs text-muted-foreground">{r.actorRole ? ROLE_LABELS[r.actorRole] : ''}</span></span> : <span className="text-muted-foreground">System / anonymous</span>) },
    { key: 'entity', header: 'Entity', cell: (r) => <span className="text-xs">{r.entityType}<span className="block font-mono text-muted-foreground">{r.entityId?.slice(0, 8)}</span></span> },
    { key: 'change', header: 'Change', cell: (r) => (r.fromStatus || r.toStatus ? <span className="text-xs">{r.fromStatus ?? '—'} → {r.toStatus ?? '—'}</span> : '—') },
  ];

  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of important actions. Entries cannot be edited or deleted." />
      <form
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(e) => { e.preventDefault(); set({ ...draft }); }}
      >
        <Field><FieldLabel htmlFor="a-action">Event prefix</FieldLabel><Input id="a-action" placeholder="e.g. article. or auth.login" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} /></Field>
        <Field><FieldLabel htmlFor="a-type">Entity type</FieldLabel><Input id="a-type" placeholder="e.g. Article" value={draft.entityType} onChange={(e) => setDraft({ ...draft, entityType: e.target.value })} /></Field>
        <Field><FieldLabel htmlFor="a-id">Entity ID</FieldLabel><Input id="a-id" value={draft.entityId} onChange={(e) => setDraft({ ...draft, entityId: e.target.value })} /></Field>
        <Field><FieldLabel htmlFor="a-from">From</FieldLabel><Input id="a-from" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></Field>
        <Field><FieldLabel htmlFor="a-to">To</FieldLabel><Input id="a-to" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></Field>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="ghost" onClick={() => { setDraft({ action: '', entityType: '', entityId: '', from: '', to: '' }); reset(); }}>Clear</Button>
        </div>
      </form>
      <DataTable columns={columns} rows={q.data?.data} getKey={(r) => r.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty={{ title: 'No audit events match' }} />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{open.action}</DialogTitle>
              <DialogDescription>{formatDateTime(open.createdAt)} · request {open.requestId ?? '—'}</DialogDescription>
            </DialogHeader>
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify({ entity: `${open.entityType} ${open.entityId ?? ''}`, from: open.fromStatus, to: open.toStatus, actor: open.actor, metadata: open.metadata }, null, 2)}</pre>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

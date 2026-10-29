'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PRODUCTION_STATUSES, STATUS_LABELS } from '@/lib/constants/status';
import { formatDate } from '@/lib/format';
import { fullName } from '@/lib/links';
import { useListState } from '@/hooks/use-list-state';
import type { ProductionRow } from '@/types/domain';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';

const DEFAULTS = { page: '1', search: '', status: '', assignedToMe: '' };

export default function ProductionQueuePage() {
  const { state, set, reset, page } = useListState(DEFAULTS);
  const q = useQuery({
    queryKey: ['production', 'queue', state],
    queryFn: () => api.get<ProductionRow[]>('/production/articles', { page, pageSize: 20, search: state.search, status: state.status, assignedToMe: state.assignedToMe }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<ProductionRow>[] = [
    { key: 'title', header: 'Title', className: 'min-w-64', cell: (a) => <span className="line-clamp-2">{a.title}</span> },
    { key: 'id', header: 'ID', cell: (a) => <span className="font-mono text-xs">{a.submissionId}</span> },
    { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
    { key: 'task', header: 'Task', cell: (a) => (a.productionTask ? a.productionTask.status.replace(/_/g, ' ').toLowerCase() : '—') },
    { key: 'assignee', header: 'Assigned to', cell: (a) => (a.productionTask?.assignedTo ? fullName(a.productionTask.assignedTo) : <span className="text-muted-foreground">Unassigned</span>) },
    { key: 'accepted', header: 'Accepted', cell: (a) => formatDate(a.acceptedAt) },
  ];

  return (
    <>
      <PageHeader title="Production queue" description="Accepted articles awaiting or undergoing production." />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search title or submission ID"
        dirty={!!(state.search || state.status || state.assignedToMe)}
        onReset={reset}
        filters={[
          { key: 'status', label: 'Status', value: state.status, onChange: (v) => set({ status: v }), options: PRODUCTION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
          { key: 'mine', label: 'Assignment', value: state.assignedToMe, onChange: (v) => set({ assignedToMe: v }), options: [{ value: 'true', label: 'Assigned to me' }] },
        ]}
      />
      <DataTable columns={columns} rows={q.data?.data} getKey={(a) => a.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} rowHref={(a) => `/production/articles/${a.id}`} empty={{ title: 'No articles in production', description: 'Accepted articles appear here for typesetting.' }} />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

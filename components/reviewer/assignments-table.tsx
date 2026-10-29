'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';
import { recommendationLabel } from '@/lib/constants/status';
import { useListState } from '@/hooks/use-list-state';
import type { AssignmentRow } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { EnumBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';

const TONE = { ASSIGNED: 'warning', SUBMITTED: 'success', DECLINED: 'danger', REVOKED: 'neutral' } as const;

/** Shared by "Assigned manuscripts" (all statuses, filterable) and "Review history" (submitted only). */
export function AssignmentsTable({ history }: { history?: boolean }) {
  const defaults = { page: '1', search: '', status: '' };
  const { state, set, reset, page } = useListState(defaults);
  const endpoint = history ? '/reviewer/history' : '/reviewer/assignments';
  const q = useQuery({
    queryKey: ['reviewer', history ? 'history' : 'assignments', state],
    queryFn: () => api.get<AssignmentRow[]>(endpoint, { page, pageSize: 15, search: state.search, status: history ? undefined : state.status }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<AssignmentRow>[] = [
    { key: 'title', header: 'Manuscript', className: 'min-w-64', cell: (a) => <span className="line-clamp-2">{a.article.title}</span> },
    { key: 'id', header: 'Submission ID', cell: (a) => <span className="font-mono text-xs">{a.article.submissionId}</span> },
    { key: 'area', header: 'Subject area', cell: (a) => a.article.subjectArea?.name ?? '—' },
    { key: 'status', header: 'My review', cell: (a) => <EnumBadge value={a.status} tone={TONE[a.status]} /> },
    { key: 'due', header: 'Due', cell: (a) => (a.dueDate ? <span className={a.status === 'ASSIGNED' && isOverdue(a.dueDate) ? 'font-medium text-destructive' : ''}>{formatDate(a.dueDate)}</span> : '—') },
    history
      ? { key: 'rec', header: 'My recommendation', cell: (a) => <Badge variant="secondary">{recommendationLabel(a.report?.recommendation)}</Badge> }
      : { key: 'assigned', header: 'Assigned', cell: (a) => formatDate(a.assignedAt) },
    ...(history ? [{ key: 'sub', header: 'Submitted', cell: (a: AssignmentRow) => formatDateTime(a.report?.submittedAt) }] : []),
  ];

  return (
    <>
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search title or submission ID"
        dirty={!!(state.search || state.status)}
        onReset={reset}
        filters={history ? [] : [{ key: 'status', label: 'Status', value: state.status, onChange: (v) => set({ status: v }), options: [{ value: 'ASSIGNED', label: 'Pending' }, { value: 'SUBMITTED', label: 'Submitted' }, { value: 'DECLINED', label: 'Declined' }] }]}
      />
      <DataTable
        columns={columns}
        rows={q.data?.data}
        getKey={(a) => a.id}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        rowHref={(a) => (a.status === 'REVOKED' ? undefined : `/reviewer/assignments/${a.id}`)}
        empty={{ title: history ? 'No completed reviews yet' : 'No assignments', description: history ? 'Reviews you submit are kept here.' : 'You will be emailed when the editor assigns you a manuscript.' }}
      />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

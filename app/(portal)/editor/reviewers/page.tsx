'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { useListState } from '@/hooks/use-list-state';
import type { ReviewerProfileRow, SubjectArea } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { ToneBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';

const DEFAULTS = { page: '1', search: '', subjectAreaId: '', isActive: '' };

export default function ReviewerPoolPage() {
  const { state, set, reset, page } = useListState(DEFAULTS);
  const areas = useQuery({ queryKey: ['subject-areas'], queryFn: async () => (await api.get<SubjectArea[]>('/subject-areas')).data });
  const q = useQuery({
    queryKey: ['editor', 'reviewers', state],
    queryFn: () => api.get<ReviewerProfileRow[]>('/editorial/reviewers', { page, pageSize: 20, search: state.search, subjectAreaId: state.subjectAreaId, isActive: state.isActive }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<ReviewerProfileRow>[] = [
    { key: 'name', header: 'Reviewer', className: 'min-w-48', cell: (r) => `${r.user.firstName} ${r.user.lastName}` },
    { key: 'code', header: 'Reviewer ID', cell: (r) => <span className="font-mono text-xs">{r.reviewerCode}</span> },
    { key: 'inst', header: 'Institution', cell: (r) => r.institution ?? '—' },
    { key: 'qual', header: 'Qualification', cell: (r) => <span>{r.highestQualification ?? '—'}<span className="block text-xs text-muted-foreground">{r.yearsTeaching} yrs teaching{r.holdsMPharm ? ' · M.Pharm' : ''}</span></span> },
    { key: 'areas', header: 'Subject areas', className: 'min-w-48', cell: (r) => <span className="flex flex-wrap gap-1">{r.subjectAreas.map((s) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}</span> },
    { key: 'open', header: 'Open', cell: (r) => <span className="tabular-nums">{r.activeAssignments}</span> },
    { key: 'status', header: 'Status', cell: (r) => <ToneBadge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</ToneBadge> },
    { key: 'since', header: 'Approved', cell: (r) => formatDate(r.approvedAt) },
  ];

  return (
    <>
      <PageHeader title="Reviewer pool" description="Approved reviewers with their subject areas and qualifications. Reviewers are assigned from an article’s Reviewers tab." />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search name, ID, institution"
        dirty={!!(state.search || state.subjectAreaId || state.isActive)}
        onReset={reset}
        filters={[
          { key: 'area', label: 'Subject area', value: state.subjectAreaId, onChange: (v) => set({ subjectAreaId: v }), options: (areas.data ?? []).map((a) => ({ value: a.id, label: a.name })) },
          { key: 'active', label: 'Status', value: state.isActive, onChange: (v) => set({ isActive: v }), options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
        ]}
      />
      <DataTable
        columns={columns}
        rows={q.data?.data}
        getKey={(r) => r.id}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        rowHref={(r) => `/editor/reviewers/${r.id}`}
        empty={{ title: 'No reviewers found', description: 'Approve reviewer applications to build the pool.' }}
      />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

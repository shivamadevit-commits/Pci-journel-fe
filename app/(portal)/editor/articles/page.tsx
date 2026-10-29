'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useFeatures } from '@/hooks/use-features';
import { api } from '@/lib/api-client';
import { ARTICLE_STATUSES, PAYMENT_STATUSES, STATUS_LABELS } from '@/lib/constants/status';
import { formatDate } from '@/lib/format';
import { fullName } from '@/lib/links';
import { useListState } from '@/hooks/use-list-state';
import type { ArticleSummary } from '@/types/domain';
import { PageHeader } from '@/components/shared/page-header';
import { PaymentBadge, StatusBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar, type FilterDef } from '@/components/tables/list-toolbar';

const DEFAULTS = { page: '1', search: '', status: '', apcStatus: '', wordLimitExceeded: '', editorId: '', sortBy: 'submittedAt', sortOrder: 'desc' };

export default function EditorArticlesPage() {
  const { paymentEnabled } = useFeatures();
  const { state, set, reset, page } = useListState(DEFAULTS);
  const q = useQuery({
    queryKey: ['editor', 'articles', state],
    queryFn: () =>
      api.get<ArticleSummary[]>('/editorial/articles', {
        page,
        pageSize: 20,
        search: state.search,
        status: state.status,
        apcStatus: state.apcStatus,
        wordLimitExceeded: state.wordLimitExceeded,
        editorId: state.editorId,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<ArticleSummary>[] = [
    { key: 'title', header: 'Title', sortKey: 'title', className: 'min-w-64', cell: (a) => <span className="line-clamp-2">{a.title}</span> },
    { key: 'id', header: 'ID', sortKey: 'submissionId', cell: (a) => <span className="font-mono text-xs">{a.submissionId}</span> },
    { key: 'author', header: 'Author', cell: (a) => fullName(a.author) },
    { key: 'status', header: 'Status', sortKey: 'status', cell: (a) => <StatusBadge status={a.status} /> },
    { key: 'apc', header: 'APC', cell: (a) => (a.payment ? <PaymentBadge status={a.payment.status} /> : '—') },
    {
      key: 'words',
      header: 'Words',
      cell: (a) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          {a.currentWordCount.toLocaleString()}
          {a.wordLimitExceeded && <AlertTriangle className="size-3.5 text-amber-600" aria-label="Exceeds word limit" />}
        </span>
      ),
    },
    { key: 'editor', header: 'Editor', cell: (a) => (a.editor ? fullName(a.editor) : <span className="text-muted-foreground">Unassigned</span>) },
    { key: 'submitted', header: 'Submitted', sortKey: 'submittedAt', cell: (a) => formatDate(a.submittedAt) },
  ];

  const allFilters: FilterDef[] = [
      { key: 'status', label: 'Status', value: state.status, onChange: (v) => set({ status: v }), options: ARTICLE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
      { key: 'apc', label: 'APC', value: state.apcStatus, onChange: (v) => set({ apcStatus: v }), options: PAYMENT_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })) },
      { key: 'words', label: 'Word limit', value: state.wordLimitExceeded, onChange: (v) => set({ wordLimitExceeded: v }), options: [{ value: 'true', label: 'Exceeds limit' }, { value: 'false', label: 'Within limit' }] },
      { key: 'editor', label: 'Editor', value: state.editorId, onChange: (v) => set({ editorId: v }), options: [{ value: 'unassigned', label: 'Unassigned' }] },
  ];
  const filters = allFilters.filter((f) => paymentEnabled || f.key !== 'apc');

  return (
    <>
      <PageHeader title="Manuscripts" description="Screening queue and all manuscripts you can access." />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search title, ID, author"
        dirty={!!(state.search || state.status || state.apcStatus || state.wordLimitExceeded || state.editorId)}
        onReset={reset}
        filters={filters}
      />
      <DataTable
        columns={paymentEnabled ? columns : columns.filter((c) => c.key !== 'apc')}
        rows={q.data?.data}
        getKey={(a) => a.id}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        rowHref={(a) => `/editor/articles/${a.id}`}
        sort={{ sortBy: state.sortBy, sortOrder: state.sortOrder as 'asc' | 'desc' }}
        onSort={(s) => set(s)}
        empty={{ title: 'No manuscripts match', description: 'Change the filters or search to see more.' }}
      />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FilePlus2 } from 'lucide-react';
import { useFeatures } from '@/hooks/use-features';
import { api } from '@/lib/api-client';
import { ARTICLE_STATUSES, STATUS_LABELS } from '@/lib/constants/status';
import { formatDate } from '@/lib/format';
import { useListState } from '@/hooks/use-list-state';
import type { ArticleSummary } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { PaymentBadge, StatusBadge } from '@/components/shared/status-badge';
import { DataTable, PaginationBar, type Column } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';

const DEFAULTS = { page: '1', search: '', status: '', sortBy: 'submittedAt', sortOrder: 'desc' };

export default function MyArticlesPage() {
  const { paymentEnabled } = useFeatures();
  const { state, set, reset, page } = useListState(DEFAULTS);
  const q = useQuery({
    queryKey: ['author', 'articles', state],
    queryFn: () => api.get<ArticleSummary[]>('/author/articles', { page, pageSize: 15, search: state.search, status: state.status, sortBy: state.sortBy, sortOrder: state.sortOrder }),
    placeholderData: (prev) => prev,
  });

  const columns: Column<ArticleSummary>[] = [
    { key: 'title', header: 'Title', sortKey: 'title', cell: (a) => <span className="line-clamp-2">{a.title}</span>, className: 'min-w-64' },
    { key: 'id', header: 'Submission ID', cell: (a) => <span className="font-mono text-xs">{a.submissionId}</span> },
    { key: 'status', header: 'Status', sortKey: 'status', cell: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'apc',
      header: 'APC',
      cell: (a) => (a.payment ? <PaymentBadge status={a.payment.status} /> : '—'),
    },
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
    { key: 'submitted', header: 'Submitted', sortKey: 'submittedAt', cell: (a) => formatDate(a.submittedAt) },
  ];

  return (
    <>
      <PageHeader
        title="My submissions"
        description="All manuscripts you have submitted and their current status."
        actions={
          <Button asChild>
            <Link href="/author/articles/new"><FilePlus2 className="size-4" /> New submission</Link>
          </Button>
        }
      />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search title or submission ID"
        dirty={!!(state.search || state.status)}
        onReset={reset}
        filters={[{ key: 'status', label: 'Status', value: state.status, onChange: (v) => set({ status: v }), options: ARTICLE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })) }]}
      />
      <DataTable
        columns={paymentEnabled ? columns : columns.filter((c) => c.key !== 'apc')}
        rows={q.data?.data}
        getKey={(a) => a.id}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        rowHref={(a) => `/author/articles/${a.id}`}
        sort={{ sortBy: state.sortBy, sortOrder: state.sortOrder as 'asc' | 'desc' }}
        onSort={(s) => set(s)}
        empty={{ title: 'No submissions found', description: 'Submit a manuscript to get started.', action: <Button asChild><Link href="/author/articles/new">New submission</Link></Button> }}
      />
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileText, Newspaper } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { useListState } from '@/hooks/use-list-state';
import type { PublishedArticle, SubjectArea } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states';
import { PaginationBar } from '@/components/tables/data-table';
import { ListToolbar } from '@/components/tables/list-toolbar';

const DEFAULTS = { page: '1', search: '', subjectAreaId: '', year: '' };

export default function PublishedArticlesPage() {
  const { state, set, reset, page } = useListState(DEFAULTS);
  const areas = useQuery({ queryKey: ['subject-areas'], queryFn: async () => (await api.get<SubjectArea[]>('/subject-areas')).data });
  const q = useQuery({
    queryKey: ['public', 'articles', state],
    queryFn: () => api.get<PublishedArticle[]>('/publications', { page, pageSize: 10, search: state.search, subjectAreaId: state.subjectAreaId, year: state.year }),
    placeholderData: (prev) => prev,
  });
  const thisYear = new Date().getFullYear();

  return (
    <>
      <PageHeader title="Published articles" description="Peer-reviewed articles published by the journal." />
      <ListToolbar
        search={state.search}
        onSearch={(v) => set({ search: v })}
        placeholder="Search title, abstract, keyword, author"
        dirty={!!(state.search || state.subjectAreaId || state.year)}
        onReset={reset}
        filters={[
          { key: 'area', label: 'Subject area', value: state.subjectAreaId, onChange: (v) => set({ subjectAreaId: v }), options: (areas.data ?? []).map((a) => ({ value: a.id, label: a.name })) },
          { key: 'year', label: 'Year', value: state.year, onChange: (v) => set({ year: v }), options: Array.from({ length: 8 }, (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) })) },
        ]}
      />
      {q.isLoading ? (
        <TableSkeleton rows={4} cols={1} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data!.data.length === 0 ? (
        <EmptyState icon={<Newspaper className="size-8" />} title="No published articles found" description="Try a different search or filter." />
      ) : (
        <div className="space-y-4">
          {q.data!.data.map((a) => (
            <Card key={a.submissionId}>
              <CardContent className="space-y-2">
                <Link href={`/articles/${encodeURIComponent(a.submissionId)}`} className="text-lg font-semibold hover:underline">{a.title}</Link>
                <p className="text-sm text-muted-foreground">{a.authors.map((x) => `${x.firstName} ${x.lastName}`).join(', ')}</p>
                <p className="line-clamp-3 text-sm">{a.abstract}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Published {formatDate(a.publishedAt)}</span>
                  {a.subjectArea && <Badge variant="secondary">{a.subjectArea.name}</Badge>}
                  {a.metadata?.doi && <span className="font-mono text-xs">DOI {a.metadata.doi}</span>}
                  <span className="ml-auto flex gap-2">
                    {a.files.html && <Button asChild variant="outline" size="sm"><a href={`/api${a.files.html.replace('/api/v1', '')}`} target="_blank" rel="noreferrer">HTML</a></Button>}
                    {a.files.pdf && <Button asChild variant="outline" size="sm"><a href={`/api${a.files.pdf.replace('/api/v1', '')}`} target="_blank" rel="noreferrer"><FileText className="size-3.5" /> PDF</a></Button>}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <PaginationBar meta={q.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

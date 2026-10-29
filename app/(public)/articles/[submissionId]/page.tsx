'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { PublishedArticle } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';
import { KeyValue } from '@/components/shared/stat-card';

const fileUrl = (p: string) => `/api${p.replace('/api/v1', '')}`;

export default function PublishedArticlePage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = use(params);
  const q = useQuery({ queryKey: ['public', 'article', submissionId], queryFn: async () => (await api.get<PublishedArticle>(`/publications/${encodeURIComponent(submissionId)}`)).data });
  return (
    <QueryBoundary query={q}>
      {(a) => (
        <>
          <PageHeader
            breadcrumbs={[{ label: 'Published articles', href: '/articles' }, { label: a.submissionId }]}
            title={a.title}
            description={a.authors.map((x) => `${x.firstName} ${x.lastName}${x.affiliation ? ` (${x.affiliation})` : ''}`).join('; ')}
            actions={
              <>
                {a.files.pdf && <Button asChild><a href={fileUrl(a.files.pdf)} target="_blank" rel="noreferrer"><Printer className="size-4" /> PDF / print</a></Button>}
                {a.files.html && <Button asChild variant="outline"><a href={fileUrl(a.files.html)} target="_blank" rel="noreferrer">Full text (HTML)</a></Button>}
              </>
            }
          />
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Abstract</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.abstract}</p>
                <div className="flex flex-wrap gap-1">{a.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Publication details</CardTitle></CardHeader>
              <CardContent>
                <KeyValue
                  items={[
                    { label: 'Published', value: formatDate(a.publishedAt) },
                    { label: 'Received', value: formatDate(a.submittedAt) },
                    { label: 'Accepted', value: formatDate(a.acceptedAt) },
                    { label: 'Subject area', value: a.subjectArea?.name },
                    { label: 'DOI', value: a.metadata?.doi },
                    { label: 'Volume / issue', value: [a.metadata?.volume, a.metadata?.issue].filter(Boolean).join(' / ') || null },
                    { label: 'Pages', value: a.metadata?.pages },
                    { label: 'Licence', value: a.metadata?.license },
                    { label: 'Copyright', value: a.metadata?.copyright },
                  ]}
                />
                {a.metadata?.citation && <p className="mt-4 rounded-md bg-muted/50 p-3 text-sm"><span className="font-medium">Cite as: </span>{a.metadata.citation}</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </QueryBoundary>
  );
}

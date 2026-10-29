'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useMe } from '@/hooks/use-auth';
import type { ArticleStatus } from '@/lib/constants/status';
import type { ProductionDetail } from '@/types/domain';
import { CorrectionsPanel, FinalPanel, ProofsPanel, TaskPanel, prodKey } from '@/components/production/production-panels';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';
import { KeyValue } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { WorkflowStepper } from '@/components/shared/workflow-stepper';

const NEXT: Partial<Record<ArticleStatus, { tab: string; text: string }>> = {
  ACCEPTED_PRODUCTION_PENDING: { tab: 'overview', text: 'Start production to begin typesetting.' },
  IN_PRODUCTION: { tab: 'proofs', text: 'Upload the formatted proof and send it to the author.' },
  PROOF_SENT_TO_AUTHOR: { tab: 'proofs', text: 'Waiting for the author to approve the proof or return corrections.' },
  CORRECTION_REQUIRED: { tab: 'corrections', text: 'Implement the minor corrections (route major changes to the Editor), then upload a revised proof.' },
  MAJOR_CONTENT_CHANGE_EDITOR_REVIEW: { tab: 'corrections', text: 'Waiting for the Editor to decide on a major content change.' },
  FINAL_PRODUCTION: { tab: 'final', text: 'Upload the final HTML and PDF, complete the metadata and hand off for publication.' },
};

export default function ProductionArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const tab = useSearchParams().get('tab') ?? 'overview';
  const me = useMe();
  const q = useQuery({ queryKey: prodKey(id), queryFn: async () => (await api.get<ProductionDetail>(`/production/articles/${id}`)).data });
  const go = (t: string) => router.replace(`?tab=${t}`, { scroll: false });

  return (
    <QueryBoundary query={q}>
      {(a) => {
        const next = NEXT[a.status];
        return (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Production queue', href: '/production/articles' }, { label: a.submissionId }]}
              title={a.title}
              description={<span className="flex items-center gap-2"><span className="font-mono text-xs">{a.submissionId}</span><StatusBadge status={a.status} /></span>}
            />
            <Card className="mb-4"><CardContent><WorkflowStepper status={a.status} /></CardContent></Card>
            {next && (
              <Alert className="mb-6">
                <ArrowRight className="size-4" />
                <AlertTitle>Next step</AlertTitle>
                <AlertDescription>{next.text} {tab !== next.tab && <button type="button" className="font-medium underline" onClick={() => go(next.tab)}>Go there</button>}</AlertDescription>
              </Alert>
            )}
            <Tabs value={tab} onValueChange={go}>
              <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="proofs">Proofs</TabsTrigger>
                <TabsTrigger value="corrections">Corrections{a.corrections.some((c) => ['OPEN', 'ESCALATED', 'APPROVED_BY_EDITOR'].includes(c.status)) ? ' •' : ''}</TabsTrigger>
                <TabsTrigger value="final">Final files &amp; publication</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6">
                {me.data && <TaskPanel article={a} myId={me.data.id} />}
                <Card>
                  <CardHeader><CardTitle>Article details</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <KeyValue items={[{ label: 'Subject area', value: a.subjectArea?.name }, { label: 'Word count', value: a.currentWordCount.toLocaleString() }, { label: 'Keywords', value: <span className="flex flex-wrap gap-1">{a.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</span> }]} />
                    <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Abstract</p><p className="mt-1 whitespace-pre-wrap text-sm">{a.abstract}</p></div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Authors (for typesetting)</p>
                      <ul className="mt-1 divide-y text-sm">
                        {a.coAuthors.map((c, i) => <li key={i} className="py-1.5"><span className="font-medium">{c.firstName} {c.lastName}</span>{c.isCorresponding && <Badge variant="secondary" className="ml-2">Corresponding</Badge>}<span className="block text-xs text-muted-foreground">{c.email}{c.affiliation ? ` · ${c.affiliation}` : ''}</span></li>)}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="proofs"><ProofsPanel article={a} /></TabsContent>
              <TabsContent value="corrections"><CorrectionsPanel article={a} /></TabsContent>
              <TabsContent value="final"><FinalPanel article={a} /></TabsContent>
            </Tabs>
          </>
        );
      }}
    </QueryBoundary>
  );
}

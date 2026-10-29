'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useFeatures } from '@/hooks/use-features';
import { api } from '@/lib/api-client';
import { useMe } from '@/hooks/use-auth';
import type { EditorArticleDetail } from '@/types/domain';
import { DecisionPanel } from '@/components/editor/decision-panel';
import { HistoryPanel } from '@/components/editor/history-panel';
import { articleKey } from '@/components/editor/keys';
import { OverviewPanel } from '@/components/editor/overview-panel';
import { PaymentPanel } from '@/components/editor/payment-panel';
import { PublicationPanel } from '@/components/editor/publication-panel';
import { ReviewersPanel } from '@/components/editor/reviewers-panel';
import { ReviewsPanel } from '@/components/editor/reviews-panel';
import { PlagiarismPanel, ScreeningPanel } from '@/components/editor/screening-panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { PaymentBadge, StatusBadge } from '@/components/shared/status-badge';
import { QueryBoundary } from '@/components/shared/states';
import { WorkflowStepper } from '@/components/shared/workflow-stepper';
import type { ArticleStatus } from '@/lib/constants/status';

/** What the editor should do next for each status (guidance only — the API enforces every transition). */
const NEXT: Partial<Record<ArticleStatus, { tab: string; text: string }>> = {
  SUBMITTED: { tab: 'screening', text: 'Start initial screening.' },
  UNDER_EDITORIAL_SCREENING: { tab: 'screening', text: 'Record the screening decision: proceed to plagiarism check, or reject (closes the submission).' },
  PLAGIARISM_CHECK: { tab: 'screening', text: 'Run or record the plagiarism check, then clear the manuscript for reviewers.' },
  READY_FOR_REVIEWER_ASSIGNMENT: { tab: 'reviewers', text: 'Assign exactly two reviewers manually.' },
  UNDER_REVIEW: { tab: 'reviewers', text: 'Waiting for both reviews. You can send reminders or replace a reviewer who declined.' },
  REVIEWS_RECEIVED: { tab: 'reviews', text: 'Read both reports, choose which comments to share, then record the decision.' },
  UNDER_EDITORIAL_DECISION: { tab: 'decision', text: 'Record the final decision.' },
  REVISION_REQUESTED: { tab: 'overview', text: 'Waiting for the author’s revised manuscript.' },
  MAJOR_CONTENT_CHANGE_EDITOR_REVIEW: { tab: 'major', text: 'A major content change needs your approval before production continues.' },
  FINAL_PRODUCTION: { tab: 'publication', text: 'Review the final files and metadata, then authorise publication.' },
};

export default function EditorArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const tab = useSearchParams().get('tab') ?? 'overview';
  const me = useMe();
  const { paymentEnabled } = useFeatures();
  const q = useQuery({ queryKey: articleKey(id), queryFn: async () => (await api.get<EditorArticleDetail>(`/editorial/articles/${id}`)).data });
  const go = (t: string) => (t === 'major' ? router.push('/editor/major-changes') : router.replace(`?tab=${t}`, { scroll: false }));

  return (
    <QueryBoundary query={q}>
      {(a) => {
        const next = NEXT[a.status];
        return (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Manuscripts', href: '/editor/articles' }, { label: a.submissionId }]}
              title={a.title}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{a.submissionId}</span>
                  <StatusBadge status={a.status} />
                  {a.payment && <PaymentBadge status={a.payment.status} />}
                  {a.wordLimitExceeded && <Badge variant="outline" className="border-amber-400 text-amber-700"><AlertTriangle className="size-3" /> Over word limit</Badge>}
                </span>
              }
            />
            <Card className="mb-4"><CardContent><WorkflowStepper status={a.status} /></CardContent></Card>
            {next && (
              <Alert className="mb-6">
                <ArrowRight className="size-4" />
                <AlertTitle>Next step</AlertTitle>
                <AlertDescription>
                  {next.text}{' '}
                  <button type="button" className="font-medium underline" onClick={() => go(next.tab)}>Go there</button>
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={tab} onValueChange={go}>
              <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="screening">Screening &amp; plagiarism</TabsTrigger>
                {paymentEnabled && <TabsTrigger value="payment">APC</TabsTrigger>}
                <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
                <TabsTrigger value="reviews">Reports &amp; comments</TabsTrigger>
                <TabsTrigger value="decision">Decision</TabsTrigger>
                <TabsTrigger value="publication">Production &amp; publication</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">{me.data && <OverviewPanel article={a} role={me.data.role} />}</TabsContent>
              <TabsContent value="screening" className="space-y-6"><ScreeningPanel article={a} /><PlagiarismPanel article={a} /></TabsContent>
              {paymentEnabled && <TabsContent value="payment"><PaymentPanel article={a} /></TabsContent>}
              <TabsContent value="reviewers"><ReviewersPanel article={a} /></TabsContent>
              <TabsContent value="reviews"><ReviewsPanel article={a} /></TabsContent>
              <TabsContent value="decision"><DecisionPanel article={a} /></TabsContent>
              <TabsContent value="publication" className="space-y-6">
                {a.productionTask && (
                  <Card>
                    <CardContent className="text-sm">
                      Production task: <strong>{a.productionTask.status.replace(/_/g, ' ').toLowerCase()}</strong>
                      {a.productionTask.assignedTo ? ` · assigned to ${a.productionTask.assignedTo.firstName} ${a.productionTask.assignedTo.lastName}` : ' · unassigned'}
                    </CardContent>
                  </Card>
                )}
                <PublicationPanel article={a} />
              </TabsContent>
              <TabsContent value="history"><HistoryPanel articleId={id} /></TabsContent>
            </Tabs>
          </>
        );
      }}
    </QueryBoundary>
  );
}

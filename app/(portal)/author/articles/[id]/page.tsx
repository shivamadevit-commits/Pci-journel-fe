'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useFeatures } from '@/hooks/use-features';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { sectionLabel } from '@/lib/constants/status';
import type { AuthorArticleDetail } from '@/types/domain';
import { AuthorProofsPanel } from '@/components/author/proofs-panel';
import { RevisionPanel } from '@/components/author/revision-panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DownloadButton } from '@/components/shared/download-button';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { PaymentBadge, StatusBadge, EnumBadge } from '@/components/shared/status-badge';
import { KeyValue } from '@/components/shared/stat-card';
import { EmptyState, QueryBoundary } from '@/components/shared/states';
import { WorkflowStepper } from '@/components/shared/workflow-stepper';

const DECISION_LABEL: Record<string, string> = { REJECT_AT_SCREENING: 'Rejected at screening', REJECT: 'Rejected', ACCEPT: 'Accepted', REQUEST_REVISION: 'Revision requested' };

export default function AuthorArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const sp = useSearchParams();
  const { paymentEnabled } = useFeatures();
  const tab = sp.get('tab') ?? 'overview';
  const q = useQuery({ queryKey: ['author', 'article', id], queryFn: async () => (await api.get<AuthorArticleDetail>(`/author/articles/${id}`)).data });

  return (
    <QueryBoundary query={q}>
      {(a) => (
        <>
          <PageHeader
            breadcrumbs={[{ label: 'My submissions', href: '/author/articles' }, { label: a.submissionId }]}
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

          <Card className="mb-6">
            <CardContent>
              <WorkflowStepper status={a.status} />
            </CardContent>
          </Card>

          {a.status === 'REVISION_REQUESTED' && <div className="mb-6"><RevisionPanel articleId={id} /></div>}
          {a.status === 'PROOF_SENT_TO_AUTHOR' && (
            <Alert className="mb-6">
              <AlertTriangle className="size-4" />
              <AlertTitle>A proof is waiting for your review</AlertTitle>
              <AlertDescription>
                Open the <button type="button" className="font-medium underline" onClick={() => router.replace(`?tab=proofs`)}>Proofs &amp; corrections</button> tab to approve it or send corrections.
              </AlertDescription>
            </Alert>
          )}
          {a.status === 'PUBLISHED' && (
            <Alert className="mb-6">
              <AlertTitle>Your article is published</AlertTitle>
              <AlertDescription>Published on {formatDate(a.publishedAt)}. <a className="font-medium underline" href={`/articles/${encodeURIComponent(a.submissionId)}`}>View the public article page</a>.</AlertDescription>
            </Alert>
          )}

          <Tabs value={tab} onValueChange={(v) => router.replace(`?tab=${v}`, { scroll: false })}>
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="decision">Decision &amp; comments</TabsTrigger>
              <TabsTrigger value="proofs">Proofs &amp; corrections</TabsTrigger>
              {paymentEnabled && <TabsTrigger value="payment">Payment (APC)</TabsTrigger>}
              <TabsTrigger value="history">Status history</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <KeyValue
                    items={[
                      { label: 'Submitted', value: formatDateTime(a.submittedAt) },
                      { label: 'Subject area', value: a.subjectArea?.name },
                      { label: 'Word count', value: `${a.currentWordCount.toLocaleString()} (limit ${a.wordLimit.toLocaleString()})` },
                      { label: 'Keywords', value: <span className="flex flex-wrap gap-1">{a.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</span> },
                    ]}
                  />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Abstract</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{a.abstract}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ethics statement</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{a.ethicsStatement}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Authors</CardTitle></CardHeader>
                <CardContent>
                  <ul className="divide-y text-sm">
                    {a.coAuthors.map((c, i) => (
                      <li key={i} className="py-2">
                        <span className="font-medium">{c.firstName} {c.lastName}</span> {c.isCorresponding && <Badge variant="secondary">Corresponding</Badge>}
                        <p className="text-xs text-muted-foreground">{c.email}{c.affiliation ? ` · ${c.affiliation}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Manuscript versions</CardTitle>
                  <CardDescription>All uploaded versions are preserved.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y text-sm">
                    {a.versions.map((v) => (
                      <li key={v.versionNumber} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <span className="font-medium">Version {v.versionNumber}</span> <EnumBadge value={v.kind} />
                          <p className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)} · {v.wordCount.toLocaleString()} words{v.changeNote ? ` · ${v.changeNote}` : ''}</p>
                        </div>
                        <div className="flex gap-2">
                          <DownloadButton fileId={v.fileId} fallbackName={`${a.submissionId}-v${v.versionNumber}.docx`}>Manuscript</DownloadButton>
                          {v.titlePageFileId && <DownloadButton fileId={v.titlePageFileId}>Title page</DownloadButton>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="decision" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Editorial decisions</CardTitle>
                  <CardDescription>Reviewer identities are never disclosed.</CardDescription>
                </CardHeader>
                <CardContent>
                  {a.decisions.length === 0 ? (
                    <EmptyState title="No decision yet" description="You will be notified when the editor decides." />
                  ) : (
                    <ul className="space-y-3">
                      {a.decisions.map((d, i) => (
                        <li key={i} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{DECISION_LABEL[d.decision] ?? d.decision}</span>
                            <span className="text-xs text-muted-foreground">{formatDateTime(d.decidedAt)}</span>
                          </div>
                          {d.authorMessage && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{d.authorMessage}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reviewer comments approved by the Editor</CardTitle>
                  <CardDescription>Only comments the Editor chose to share appear here.</CardDescription>
                </CardHeader>
                <CardContent>
                  {a.approvedReviewerComments.length === 0 ? (
                    <EmptyState title="No comments shared" description="Approved reviewer comments appear here after the final decision." />
                  ) : (
                    <div className="space-y-5">
                      {a.approvedReviewerComments.map((r) => (
                        <div key={r.label}>
                          <p className="mb-2 text-sm font-semibold">{r.label}</p>
                          <ul className="space-y-2">
                            {r.comments.map((c, i) => (
                              <li key={i} className="rounded-lg border p-3 text-sm">
                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{sectionLabel(c.section)}</p>
                                <p className="whitespace-pre-wrap">{c.text}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proofs">
              <AuthorProofsPanel articleId={id} />
            </TabsContent>

            {paymentEnabled && (
              <TabsContent value="payment">
                <PaymentCard article={a} />
              </TabsContent>
            )}

            <TabsContent value="history">
              <Card>
                <CardContent>
                  <ol className="relative space-y-4 border-l pl-5">
                    {a.statusHistory.map((h, i) => (
                      <li key={i} className="text-sm">
                        <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border bg-background" aria-hidden />
                        <p className="font-medium">{h.toLabel}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(h.at)}</p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </QueryBoundary>
  );
}

function PaymentCard({ article }: { article: AuthorArticleDetail }) {
  const p = article.payment;
  const checkout = useAction({
    fn: () => api.post<{ checkoutUrl: string }>(`/author/articles/${article.id}/payment/checkout`),
    success: false,
    onSuccess: (r) => {
      toast.info('Redirecting to the payment page…');
      window.location.assign(r.checkoutUrl);
    },
  });
  const due = p && (p.status === 'PENDING' || p.status === 'FAILED');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="size-5" /> Article Publishing Charge</CardTitle>
        <CardDescription>The APC is payable at submission, subject to PCI’s confirmed payment rules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {p ? (
          <KeyValue
            items={[
              { label: 'Status', value: <PaymentBadge status={p.status} /> },
              { label: 'Amount', value: p.amount ? formatMoney(p.amount, p.currency) : 'Not set yet' },
              { label: 'Paid on', value: formatDateTime(p.paidAt) },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No payment record.</p>
        )}
        {due && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">If an online gateway is available you can pay below; otherwise the editorial office records your payment manually.</p>
            <LoadingButton loading={checkout.isPending} onClick={() => checkout.mutate()}>Pay online</LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

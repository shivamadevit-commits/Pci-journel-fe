'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FilePlus2, FileText, Hourglass, Send } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { AuthorDashboard } from '@/types/domain';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { PaymentBadge, StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState, QueryBoundary } from '@/components/shared/states';
import { useMe } from '@/hooks/use-auth';

export default function AuthorDashboardPage() {
  const me = useMe();
  const q = useQuery({ queryKey: ['author', 'dashboard'], queryFn: async () => (await api.get<AuthorDashboard>('/author/dashboard')).data });

  return (
    <>
      <PageHeader
        title={`Welcome${me.data ? `, ${me.data.firstName}` : ''}`}
        description="Track your submissions and respond to requests from the editorial office."
        actions={
          <Button asChild>
            <Link href="/author/articles/new"><FilePlus2 className="size-4" /> New submission</Link>
          </Button>
        }
      />
      <QueryBoundary query={q}>
        {(d) => {
          const count = (...s: string[]) => d.totals.filter((t) => s.includes(t.status)).reduce((a, t) => a + t.count, 0);
          const total = d.totals.reduce((a, t) => a + t.count, 0);
          const inReview = count('UNDER_EDITORIAL_SCREENING', 'PLAGIARISM_CHECK', 'READY_FOR_REVIEWER_ASSIGNMENT', 'UNDER_REVIEW', 'REVIEWS_RECEIVED', 'UNDER_EDITORIAL_DECISION', 'SUBMITTED');
          const production = count('ACCEPTED_PRODUCTION_PENDING', 'IN_PRODUCTION', 'PROOF_SENT_TO_AUTHOR', 'CORRECTION_REQUIRED', 'MAJOR_CONTENT_CHANGE_EDITOR_REVIEW', 'FINAL_PRODUCTION');
          const pending = d.pendingActions;
          return (
            <div className="space-y-6">
              {(pending.proofsAwaitingReview.length > 0 || pending.revisionsRequested.length > 0) && (
                <div className="space-y-2">
                  {pending.proofsAwaitingReview.map((p) => (
                    <Alert key={p.id}>
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Proof awaiting your review</AlertTitle>
                      <AlertDescription>
                        {p.article.submissionId} — {p.article.title}.{' '}
                        <Link href={`/author/articles/${p.article.id}?tab=proofs`} className="font-medium underline">Review proof v{p.versionNumber}</Link>
                      </AlertDescription>
                    </Alert>
                  ))}
                  {pending.revisionsRequested.map((r) => (
                    <Alert key={r.id}>
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Revision requested</AlertTitle>
                      <AlertDescription>
                        {r.submissionId} — {r.title}. <Link href={`/author/articles/${r.id}`} className="font-medium underline">Upload revised manuscript</Link>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="All submissions" value={total} icon={FileText} href="/author/articles" />
                <StatCard label="In editorial process" value={inReview} icon={Hourglass} href="/author/articles" />
                <StatCard label="In production" value={production} icon={Send} href="/author/articles" />
                <StatCard label="Published" value={count('PUBLISHED')} icon={CheckCircle2} tone="success" href="/author/articles?status=PUBLISHED" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent submissions</CardTitle>
                  <CardDescription>Your five most recent manuscripts.</CardDescription>
                </CardHeader>
                <CardContent>
                  {d.recentSubmissions.length === 0 ? (
                    <EmptyState title="No submissions yet" description="Submit your first manuscript to get started." action={<Button asChild><Link href="/author/articles/new">New submission</Link></Button>} />
                  ) : (
                    <ul className="divide-y">
                      {d.recentSubmissions.map((a) => (
                        <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <Link href={`/author/articles/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                            <p className="text-xs text-muted-foreground">{a.submissionId} · submitted {formatDate(a.submittedAt)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge status={a.status} />
                            {a.payment && <PaymentBadge status={a.payment.status} />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}

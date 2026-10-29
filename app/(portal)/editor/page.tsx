'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, ClipboardList, FileSearch, Gavel, GitPullRequestArrow, Hourglass, ScanSearch, UserPlus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate, } from '@/lib/format';
import { fullName } from '@/lib/links';
import type { EditorDashboard } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { PaymentBadge, StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { QueryBoundary } from '@/components/shared/states';

export default function EditorDashboardPage() {
  const q = useQuery({ queryKey: ['editor', 'dashboard'], queryFn: async () => (await api.get<EditorDashboard>('/editorial/dashboard')).data });
  return (
    <>
      <PageHeader title="Editorial dashboard" description="Queues that need an editorial action." />
      <QueryBoundary query={q}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Awaiting screening" value={d.queues.awaitingScreening} icon={FileSearch} href="/editor/articles?status=SUBMITTED" tone={d.queues.awaitingScreening ? 'warning' : undefined} />
              <StatCard label="Plagiarism check" value={d.queues.plagiarismCheck} icon={ScanSearch} href="/editor/articles?status=PLAGIARISM_CHECK" />
              <StatCard label="Ready for reviewers" value={d.queues.readyForReviewerAssignment} icon={UserPlus} href="/editor/articles?status=READY_FOR_REVIEWER_ASSIGNMENT" tone={d.queues.readyForReviewerAssignment ? 'warning' : undefined} />
              <StatCard label="Under review" value={d.queues.underReview} icon={BookOpenCheck} href="/editor/articles?status=UNDER_REVIEW" />
              <StatCard label="Awaiting decision" value={d.queues.awaitingDecision} icon={Gavel} href="/editor/articles?status=REVIEWS_RECEIVED" tone={d.queues.awaitingDecision ? 'warning' : undefined} />
              <StatCard label="Major content changes" value={d.queues.majorContentChanges} icon={GitPullRequestArrow} href="/editor/major-changes" tone={d.queues.majorContentChanges ? 'warning' : undefined} />
              <StatCard label="Reviewer applications" value={d.queues.pendingReviewerApplications} icon={ClipboardList} href="/editor/applications" />
              <StatCard label="Overdue reviews" value={d.queues.overdueReviews} icon={Hourglass} tone={d.queues.overdueReviews ? 'danger' : undefined} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline</CardTitle>
                <CardDescription>Manuscripts by status.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {d.totals.length === 0 && <p className="text-sm text-muted-foreground">No manuscripts yet.</p>}
                {d.totals.map((t) => (
                  <Link key={t.status} href={`/editor/articles?status=${t.status}`} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted/50">
                    <StatusBadge status={t.status} /> <span className="font-semibold tabular-nums">{t.count}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {d.recentSubmissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>
                ) : (
                  <ul className="divide-y">
                    {d.recentSubmissions.map((a) => (
                      <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <Link href={`/editor/articles/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                          <p className="text-xs text-muted-foreground">{a.submissionId} · {fullName(a.author)} · {formatDate(a.submittedAt)}</p>
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
        )}
      </QueryBoundary>
    </>
  );
}

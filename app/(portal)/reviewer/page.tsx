'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, BookOpenCheck, CheckCircle2, Hourglass } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDate, isOverdue } from '@/lib/format';
import type { ReviewerDashboard } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, QueryBoundary } from '@/components/shared/states';
import { StatCard } from '@/components/shared/stat-card';

export default function ReviewerDashboardPage() {
  const q = useQuery({ queryKey: ['reviewer', 'dashboard'], queryFn: async () => (await api.get<ReviewerDashboard>('/reviewer/dashboard')).data });
  return (
    <>
      <PageHeader title="Reviewer dashboard" description="Manuscripts awaiting your review. Author identities are hidden throughout the review." />
      <QueryBoundary query={q}>
        {(d) => {
          const n = (s: string) => d.counts.find((c) => c.status === s)?.count ?? 0;
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Reviewer ID" value={<span className="font-mono text-xl">{d.reviewerCode ?? '—'}</span>} icon={BadgeCheck} />
                <StatCard label="Pending reviews" value={n('ASSIGNED')} icon={BookOpenCheck} href="/reviewer/assignments?status=ASSIGNED" tone={n('ASSIGNED') ? 'warning' : undefined} />
                <StatCard label="Overdue" value={d.overdue} icon={Hourglass} tone={d.overdue ? 'danger' : undefined} />
                <StatCard label="Completed" value={n('SUBMITTED')} icon={CheckCircle2} href="/reviewer/history" tone="success" />
              </div>
              <Card>
                <CardHeader><CardTitle>Awaiting your review</CardTitle><CardDescription>Oldest first.</CardDescription></CardHeader>
                <CardContent>
                  {d.pending.length === 0 ? (
                    <EmptyState title="Nothing pending" description="New assignments will be emailed to you and appear here." />
                  ) : (
                    <ul className="divide-y">
                      {d.pending.map((p) => (
                        <li key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <Link href={`/reviewer/assignments/${p.id}`} className="font-medium hover:underline">{p.article.title}</Link>
                            <p className="font-mono text-xs text-muted-foreground">{p.article.submissionId} · assigned {formatDate(p.assignedAt)}</p>
                          </div>
                          {p.dueDate ? (
                            <Badge variant={isOverdue(p.dueDate) ? 'destructive' : 'secondary'}>{isOverdue(p.dueDate) ? 'Overdue — ' : 'Due '}{formatDate(p.dueDate)}</Badge>
                          ) : (
                            <Badge variant="outline">No deadline set</Badge>
                          )}
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

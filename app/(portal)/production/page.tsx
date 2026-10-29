'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Inbox, PackageCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ProductionDashboard } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';

export default function ProductionDashboardPage() {
  const q = useQuery({ queryKey: ['production', 'dashboard'], queryFn: async () => (await api.get<ProductionDashboard>('/production/dashboard')).data });
  return (
    <>
      <PageHeader title="Production dashboard" description="Accepted articles moving through typesetting, proofing and final production." />
      <QueryBoundary query={q}>
        {(d) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Awaiting production start" value={d.awaitingStart} icon={Inbox} href="/production/articles?status=ACCEPTED_PRODUCTION_PENDING" tone={d.awaitingStart ? 'warning' : undefined} />
              <StatCard label="My open tasks" value={d.myOpenTasks} icon={ClipboardCheck} href="/production/articles?assignedToMe=true" />
              <StatCard label="Ready for publication" value={d.totals.find((t) => t.status === 'FINAL_PRODUCTION')?.count ?? 0} icon={PackageCheck} href="/production/articles?status=FINAL_PRODUCTION" />
            </div>
            <Card>
              <CardHeader><CardTitle>Queue by status</CardTitle><CardDescription>Select a status to open the filtered queue.</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {d.totals.length === 0 && <p className="text-sm text-muted-foreground">No accepted articles yet.</p>}
                {d.totals.map((t) => (
                  <Link key={t.status} href={`/production/articles?status=${t.status}`} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted/50">
                    <StatusBadge status={t.status} /> <span className="font-semibold tabular-nums">{t.count}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}

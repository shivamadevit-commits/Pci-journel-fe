'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileText, ScrollText, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { AdminDashboard } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';

export default function AdminDashboardPage() {
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: async () => (await api.get<AdminDashboard>('/admin/dashboard')).data });
  return (
    <>
      <PageHeader title="Administration" description="Portal oversight for the Chief Editor / Admin." />
      <QueryBoundary query={q}>
        {(d) => {
          const activeUsers = d.users.filter((u) => u.status === 'ACTIVE').reduce((a, u) => a + u.count, 0);
          const articles = d.articles.reduce((a, x) => a + x.count, 0);
          const byRole = Object.entries(d.users.filter((u) => u.status === 'ACTIVE').reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + u.count }), {}));
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Active users" value={activeUsers} icon={Users} href="/admin/users" />
                <StatCard label="Manuscripts" value={articles} icon={FileText} href="/editor/articles" />
                <StatCard label="Reviewer applications" value={d.pendingReviewerApplications} icon={ClipboardList} href="/editor/applications" tone={d.pendingReviewerApplications ? 'warning' : undefined} />
                <StatCard label="Audit events (24h)" value={d.auditEventsLast24h} icon={ScrollText} href="/admin/audit" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Active users by role</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="divide-y text-sm">
                      {byRole.map(([role, n]) => <li key={role} className="flex justify-between py-2"><span>{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</span><span className="font-semibold tabular-nums">{n}</span></li>)}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Manuscripts by status</CardTitle><CardDescription>Open the filtered queue.</CardDescription></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {d.articles.map((a) => (
                      <Link key={a.status} href={`/editor/articles?status=${a.status}`} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted/50">
                        <StatusBadge status={a.status} /> <span className="font-semibold tabular-nums">{a.count}</span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}

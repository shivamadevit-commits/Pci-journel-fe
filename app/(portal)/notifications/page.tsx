'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { formatDateTime, timeAgo } from '@/lib/format';
import { notificationHref } from '@/lib/links';
import { useMe } from '@/hooks/use-auth';
import { useListState } from '@/hooks/use-list-state';
import type { NotificationItem } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states';
import { PaginationBar } from '@/components/tables/data-table';
import { cn } from '@/lib/utils';

const DEFAULTS = { page: '1', filter: 'all' };

export default function NotificationsPage() {
  const router = useRouter();
  const me = useMe();
  const { state, set, page } = useListState(DEFAULTS);
  const unreadOnly = state.filter === 'unread';

  const list = useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () => api.get<NotificationItem[]>('/notifications', { page, pageSize: 15, unreadOnly: unreadOnly ? 'true' : undefined }),
  });

  const invalidate = [['notifications']];
  const markAll = useAction({ fn: () => api.post('/notifications/read-all'), invalidate });
  const markOne = useAction({ fn: (id: string) => api.post(`/notifications/${id}/read`), success: false, invalidate });

  async function open(n: NotificationItem) {
    if (!n.readAt) markOne.mutate(n.id);
    const href = me.data ? notificationHref(me.data.role, n) : null;
    if (href) router.push(href);
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Workflow events that need your attention. Important events are also emailed."
        actions={
          <Button variant="outline" size="sm" disabled={markAll.isPending || !list.data?.meta?.unread} onClick={() => markAll.mutate()}>
            <CheckCheck className="size-4" /> Mark all as read
          </Button>
        }
      />
      <Tabs value={state.filter} onValueChange={(v) => set({ filter: v })} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{list.data?.meta?.unread ? ` (${list.data.meta.unread})` : ''}</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.isLoading ? (
        <TableSkeleton rows={6} cols={1} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data!.data.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" />} title={unreadOnly ? 'You’re all caught up' : 'No notifications yet'} description="New workflow events will appear here." />
      ) : (
        <Card className="divide-y p-0">
          {list.data!.data.map((n) => {
            const href = me.data ? notificationHref(me.data.role, n) : null;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none', !n.readAt && 'bg-primary/5')}
              >
                <Circle className={cn('mt-1.5 size-2.5 shrink-0', n.readAt ? 'fill-transparent text-transparent' : 'fill-primary text-primary')} aria-label={n.readAt ? undefined : 'Unread'} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', !n.readAt && 'font-semibold')}>{n.title}</span>
                  <span className="block text-sm text-muted-foreground">{n.message}</span>
                  <span className="mt-1 block text-xs text-muted-foreground" title={formatDateTime(n.createdAt)}>
                    {timeAgo(n.createdAt)}
                    {href ? ' · Open' : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </Card>
      )}
      <PaginationBar meta={list.data?.meta} onPage={(p) => set({ page: String(p) }, true)} />
    </>
  );
}

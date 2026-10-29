'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { fullName } from '@/lib/links';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { HistoryRow } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, QueryBoundary, TableSkeleton } from '@/components/shared/states';
import { historyKey } from './keys';

/** Status history with the actor of each transition (editorial view). */
export function HistoryPanel({ articleId }: { articleId: string }) {
  const q = useQuery({ queryKey: historyKey(articleId), queryFn: async () => (await api.get<HistoryRow[]>(`/editorial/articles/${articleId}/history`)).data });
  return (
    <Card>
      <CardContent>
        <QueryBoundary query={q} skeleton={<TableSkeleton rows={4} cols={1} />}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState title="No history" />
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {rows.map((h, i) => (
                  <li key={i} className="text-sm">
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border bg-background" aria-hidden />
                    <p className="font-medium">{h.fromLabel ? `${h.fromLabel} → ` : ''}{h.toLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(h.createdAt)} · {h.actor ? `${fullName(h.actor)}${h.actorRole ? ` (${ROLE_LABELS[h.actorRole]})` : ''}` : 'System'}
                      {h.reason ? ` · ${h.reason}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )
          }
        </QueryBoundary>
      </CardContent>
    </Card>
  );
}

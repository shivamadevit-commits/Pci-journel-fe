import { Inbox, TriangleAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, errorMessage } from '@/lib/api-client';

export function EmptyState({ title = 'Nothing here yet', description, action, icon }: { title?: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="size-8" aria-hidden />}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const forbidden = error instanceof ApiError && (error.status === 403 || error.status === 404);
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden />
      <p className="font-medium">{forbidden ? 'Not available' : 'Something went wrong'}</p>
      <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      {error instanceof ApiError && error.requestId && <p className="font-mono text-xs text-muted-foreground">Ref: {error.requestId}</p>}
      {onRetry && !forbidden && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm" aria-busy="true" aria-label="Loading">
      <div className="flex gap-4 border-b-2 bg-muted/60 px-4 py-3.5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3 flex-1 bg-muted-foreground/20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Renders loading / error / content for a react-query result. */
export function QueryBoundary<T>({
  query,
  skeleton,
  children,
}: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  skeleton?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <>{skeleton ?? <PageSkeleton />}</>;
  if (query.isError || query.data === undefined) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}

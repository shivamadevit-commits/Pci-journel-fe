'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states';
import type { PageMeta } from '@/types/api';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Backend sort field; when set the header becomes a sort toggle. */
  sortKey?: string;
}

export interface SortState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  getKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  rowHref?: (row: T) => string | undefined;
  empty?: { title?: string; description?: string; action?: React.ReactNode };
  sort?: SortState;
  onSort?: (s: SortState) => void;
}

export function DataTable<T>({ columns, rows, getKey, loading, error, onRetry, rowHref, empty, sort, onSort }: Props<T>) {
  if (loading) return <TableSkeleton cols={Math.min(columns.length, 6)} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={empty?.title ?? 'No results'} description={empty?.description ?? 'Try adjusting your search or filters.'} action={empty?.action} />;

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {columns.map((c) => {
              const active = sort && c.sortKey && sort.sortBy === c.sortKey;
              return (
                <TableHead key={c.key} className={c.className} aria-sort={active ? (sort!.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortKey && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-7 gap-1 px-2 font-medium"
                      onClick={() => onSort({ sortBy: c.sortKey!, sortOrder: active && sort!.sortOrder === 'desc' ? 'asc' : 'desc' })}
                    >
                      {c.header}
                      {active ? sort!.sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-40" />}
                    </Button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <TableRow key={getKey(row)} className={cn(href && 'cursor-pointer hover:bg-muted/50')}>
                {columns.map((c, i) => (
                  <TableCell key={c.key} className={cn('align-top', c.className)}>
                    {href && i === 0 ? (
                      <Link href={href} className="font-medium hover:underline focus-visible:underline">
                        {c.cell(row)}
                      </Link>
                    ) : (
                      c.cell(row)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function PaginationBar({ meta, onPage }: { meta: PageMeta | null | undefined; onPage: (p: number) => void }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <p>
        Showing <span className="font-medium text-foreground">{from}</span>–<span className="font-medium text-foreground">{to}</span> of <span className="font-medium text-foreground">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <span aria-live="polite">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

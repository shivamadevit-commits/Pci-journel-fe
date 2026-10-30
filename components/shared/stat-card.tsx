import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, icon: Icon, href, tone }: { label: string; value: React.ReactNode; icon?: LucideIcon; href?: string; tone?: 'warning' | 'danger' | 'success' }) {
  const body = (
    <Card className={cn('border-t-2 border-t-primary shadow-xs transition-all', href && 'hover:-translate-y-0.5 hover:shadow-md')}>
      <CardContent className="flex items-center justify-between gap-3 py-1">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn('text-3xl font-semibold tabular-nums text-primary', tone === 'warning' && 'text-amber-600', tone === 'danger' && 'text-red-600', tone === 'success' && 'text-emerald-600')}>{value}</p>
        </div>
        {Icon && <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"><Icon className="size-5" aria-hidden /></span>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{i.label}</dt>
          <dd className="mt-0.5 break-words text-sm">{i.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

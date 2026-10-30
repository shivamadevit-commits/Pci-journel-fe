import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; breadcrumbs?: Crumb[] }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border bg-gradient-to-r from-card via-card to-[oklch(0.93_0.03_258)] px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                {c.href ? (
                  <Link href={c.href} className="hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="size-3" aria-hidden />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-sans text-balance text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

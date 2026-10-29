import { Check, CircleAlert, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANCH_ANCHOR, MAIN_FLOW, STATUS_LABELS, type ArticleStatus } from '@/lib/constants/status';

/**
 * Read-only visualisation of the BRD workflow. It never decides what a user may do — available actions come
 * from the role + status checks in each panel and, ultimately, from the API.
 */
export function WorkflowStepper({ status }: { status: ArticleStatus }) {
  const anchor = BRANCH_ANCHOR[status];
  const currentIdx = MAIN_FLOW.indexOf((anchor ?? status) as ArticleStatus);
  const closed = status === 'REJECTED' || status === 'REJECTED_AT_SCREENING';
  // Production steps are collapsed visually for rejected paths.
  const steps = closed ? MAIN_FLOW.slice(0, currentIdx + 1) : MAIN_FLOW;

  return (
    <div className="space-y-3">
      <ol className="flex gap-1 overflow-x-auto pb-2" aria-label="Manuscript workflow progress">
        {steps.map((s, i) => {
          const done = i < currentIdx || status === 'PUBLISHED';
          const current = i === currentIdx && status !== 'PUBLISHED';
          const isEndRejected = closed && i === currentIdx;
          return (
            <li key={s} className="flex min-w-[88px] flex-1 flex-col items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-xs font-medium',
                  done && 'border-emerald-600 bg-emerald-600 text-white',
                  current && !isEndRejected && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/20',
                  isEndRejected && 'border-red-600 bg-red-600 text-white',
                  !done && !current && 'border-border text-muted-foreground',
                )}
              >
                {isEndRejected ? <XCircle className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn('text-[11px] leading-tight', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{STATUS_LABELS[s]}</span>
            </li>
          );
        })}
      </ol>
      {anchor && !closed && (
        <p className="flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
          <CircleAlert className="size-4" aria-hidden /> Current state: <strong>{STATUS_LABELS[status]}</strong>
        </p>
      )}
      {closed && (
        <p className="flex items-center gap-1.5 text-sm text-red-700 dark:text-red-300">
          <XCircle className="size-4" aria-hidden /> <strong>{STATUS_LABELS[status]}</strong>
          {status === 'REJECTED_AT_SCREENING' && ' — this submission is closed and cannot be resubmitted.'}
        </p>
      )}
    </div>
  );
}

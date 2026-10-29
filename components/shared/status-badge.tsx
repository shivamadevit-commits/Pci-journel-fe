'use client';

import { useFeatures } from '@/hooks/use-features';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PAYMENT_TONE, STATUS_LABELS, STATUS_TONE, TONE_CLASS, type ArticleStatus, type PaymentStatus, type Tone } from '@/lib/constants/status';

export function ToneBadge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', TONE_CLASS[tone], className)}>
      {children}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: ArticleStatus; className?: string }) {
  return (
    <ToneBadge tone={STATUS_TONE[status]} className={className}>
      {STATUS_LABELS[status]}
    </ToneBadge>
  );
}

export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const { paymentEnabled } = useFeatures();
  if (!paymentEnabled) return null;
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <ToneBadge tone={PAYMENT_TONE[status]} className={className}>
      APC: {label}
    </ToneBadge>
  );
}

export function EnumBadge({ value, tone = 'neutral' }: { value: string; tone?: Tone }) {
  const label = value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

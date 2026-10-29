'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import { PAYMENT_NEXT, type PaymentStatus } from '@/lib/constants/status';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { EditorArticleDetail } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectField, TextField, TextareaField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';
import { PaymentBadge } from '@/components/shared/status-badge';
import { KeyValue } from '@/components/shared/stat-card';
import { refreshArticle } from './keys';

const schema = z.object({
  status: z.string().min(1, 'Choose a status'),
  amount: z.string().trim().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a valid amount').optional(),
  currency: z.string().trim().refine((v) => v === '' || /^[A-Za-z]{3}$/.test(v), 'Use a 3-letter currency code').optional(),
  providerReference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
});
type Values = z.infer<typeof schema>;

export function PaymentPanel({ article }: { article: EditorArticleDetail }) {
  const p = article.payment;
  const next = useMemo(() => (p ? PAYMENT_NEXT[p.status] : []), [p]);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { status: '', amount: p?.amount ?? '', currency: p?.currency ?? '', providerReference: '', note: '' } });
  const save = useAction({
    fn: (v: Values) => api.put(`/editorial/articles/${article.id}/payment`, { status: v.status, amount: v.amount || undefined, currency: v.currency || undefined, providerReference: v.providerReference || undefined, note: v.note || undefined }),
    form,
    invalidate: refreshArticle(article.id),
    onSuccess: () => form.reset({ status: '', amount: '', currency: '', providerReference: '', note: '' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="size-5" /> APC / payment</CardTitle>
        <CardDescription>Payment rules (amount, gateway, refunds) are pending PCI confirmation. Record the status manually until a gateway is connected.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {p ? (
          <KeyValue
            items={[
              { label: 'Status', value: <PaymentBadge status={p.status} /> },
              { label: 'Amount', value: p.amount ? formatMoney(p.amount, p.currency) : 'Not set' },
              { label: 'Paid on', value: formatDateTime(p.paidAt) },
              { label: 'Provider / reference', value: [p.provider, p.providerReference].filter(Boolean).join(' · ') || '—' },
              { label: 'Note', value: p.note ?? '—' },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No payment record exists.</p>
        )}

        {p && next.length > 0 ? (
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4 border-t pt-4" noValidate>
            <p className="text-sm font-medium">Update status</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField form={form} name="status" label="New status" required options={next.map((s: PaymentStatus) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
              <TextField form={form} name="amount" label="Amount" inputMode="decimal" placeholder="0.00" />
              <TextField form={form} name="currency" label="Currency" placeholder="e.g. INR" maxLength={3} />
            </div>
            <TextField form={form} name="providerReference" label="Payment reference" />
            <TextareaField form={form} name="note" label="Note" rows={2} description="Recording “Paid” requires a payment reference or a note." />
            <LoadingButton type="submit" loading={save.isPending} loadingText="Saving…">Save payment status</LoadingButton>
          </form>
        ) : (
          p && <p className="border-t pt-4 text-sm text-muted-foreground">No further status changes are possible from “{p.status}”.</p>
        )}
      </CardContent>
    </Card>
  );
}

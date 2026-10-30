'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { configSchema as schema, PUBLICATION_META_FIELDS, type ConfigValues as Values } from '@/lib/schemas/admin';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import type { PortalConfig } from '@/types/domain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { SwitchField, SelectField, TextField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/states';

const META_FIELDS = PUBLICATION_META_FIELDS;


export default function ConfigPage() {
  const q = useQuery({ queryKey: ['admin', 'config'], queryFn: async () => (await api.get<PortalConfig>('/admin/config')).data });
  return (
    <>
      <PageHeader title="Portal configuration" description="Journal rules the Admin can adjust. Changes apply immediately and are recorded in the audit log." />
      <QueryBoundary query={q}>{(c) => <ConfigForm config={c} />}</QueryBoundary>
    </>
  );
}

function ConfigForm({ config: c }: { config: PortalConfig }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {} });
  useEffect(() => {
    form.reset({
      wordLimit: c.wordLimit,
      paymentEnabled: c.paymentEnabled,
      apcEnforcement: c.apcEnforcement,
      apcDefaultAmount: c.apcDefaultAmount ?? '',
      apcCurrency: c.apcCurrency ?? '',
      allowRevisionAfterReview: c.allowRevisionAfterReview,
      reviewDueDays: c.reviewDueDays ?? '',
      reviewerMinYearsTeaching: c.reviewerMinYearsTeaching,
      publicationRequiredMetadata: c.publicationRequiredMetadata as Values['publicationRequiredMetadata'],
    });
  }, [c, form]);

  const save = useAction({
    fn: (v: Values) =>
      api.put('/admin/config', {
        wordLimit: v.wordLimit,
        paymentEnabled: v.paymentEnabled,
        apcEnforcement: v.apcEnforcement,
        apcDefaultAmount: v.apcDefaultAmount === '' ? null : v.apcDefaultAmount,
        apcCurrency: v.apcCurrency ? v.apcCurrency.toUpperCase() : null,
        allowRevisionAfterReview: v.allowRevisionAfterReview,
        reviewDueDays: v.reviewDueDays === '' ? null : v.reviewDueDays,
        reviewerMinYearsTeaching: v.reviewerMinYearsTeaching,
        publicationRequiredMetadata: v.publicationRequiredMetadata,
      }),
    form,
    invalidate: [['admin', 'config'], ['config', 'features']],
  });

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6" noValidate>
      <Alert><AlertDescription>Several rules are still awaiting PCI confirmation (APC amount and enforcement, post-review revision, review deadlines, required publication metadata). Leave them at their defaults until decided.</AlertDescription></Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Submission &amp; payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SwitchField form={form} name="paymentEnabled" label="Enable payment (APC)" description="Off: payment is bypassed. No APC is shown to authors or editors, and screening is never blocked. Turn on once payment is integrated." />
            <TextField form={form} name="wordLimit" label="Article word limit" type="number" min={1} description="Longer manuscripts are flagged for the editor (default 5,000)." />
            <SelectField form={form} name="apcEnforcement" label="APC enforcement" options={[{ value: 'none', label: 'None – do not check' }, { value: 'flag', label: 'Flag – show status only' }, { value: 'block', label: 'Block – screening needs APC paid or waived' }]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField form={form} name="apcDefaultAmount" label="Default APC amount" type="number" step="0.01" min={0} description="Leave empty until PCI confirms." />
              <TextField form={form} name="apcCurrency" label="Currency" maxLength={3} placeholder="e.g. INR" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Peer review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SwitchField form={form} name="allowRevisionAfterReview" label="Allow revision &amp; resubmission after peer review" description="Off until PCI confirms the rule. The initial-screening rejection is always final." />
            <TextField form={form} name="reviewDueDays" label="Default review deadline (days)" type="number" min={1} max={365} description="Leave empty for no default deadline." />
            <TextField form={form} name="reviewerMinYearsTeaching" label="Reviewer eligibility: years of teaching" type="number" min={0} description="Proposed minimum alternative to an M.Pharm degree (advisory)." />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Publication</CardTitle><CardDescription>Metadata fields that must be present before an article can be published.</CardDescription></CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="publicationRequiredMetadata"
            render={({ field }) => (
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {META_FIELDS.map((m) => (
                  <Field key={m} orientation="horizontal" className="w-auto">
                    <Checkbox id={`meta-${m}`} checked={field.value?.includes(m) ?? false} onCheckedChange={(c) => field.onChange(c === true ? [...(field.value ?? []), m] : (field.value ?? []).filter((x) => x !== m))} />
                    <FieldLabel htmlFor={`meta-${m}`} className="font-normal capitalize">{m}</FieldLabel>
                  </Field>
                ))}
              </div>
            )}
          />
        </CardContent>
      </Card>
      <LoadingButton type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>Save configuration</LoadingButton>
    </form>
  );
}

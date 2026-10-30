'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publicationMetadataSchema as schema, type PublicationMetadataValues as Values } from '@/lib/schemas/editorial';
import { api } from '@/lib/api-client';
import { useAction } from '@/lib/actions';
import type { PublicationMetadata } from '@/types/domain';
import { TextField, TextareaField } from '@/components/forms/fields';
import { LoadingButton } from '@/components/shared/loading-button';


const FIELDS = ['doi', 'volume', 'issue', 'pages', 'license', 'copyright', 'citation'] as const;

/** Publication metadata (PUT /publication/articles/:id/metadata). `required` marks fields PCI configured as mandatory. */
export function PublicationMetadataForm({ articleId, metadata, required, invalidate, disabled }: { articleId: string; metadata: PublicationMetadata | null | undefined; required: string[]; invalidate: unknown[][]; disabled?: boolean }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {} });
  useEffect(() => {
    form.reset(Object.fromEntries(FIELDS.map((f) => [f, metadata?.[f] ?? ''])) as Values);
  }, [metadata, form]);

  const save = useAction({
    fn: (v: Values) => {
      // Empty strings clear a value; unchanged fields are resent as-is.
      const body = Object.fromEntries(FIELDS.map((f) => [f, v[f] ? v[f] : null]));
      return api.put(`/publication/articles/${articleId}/metadata`, body);
    },
    form,
    invalidate: invalidate as never,
  });

  const req = (f: string) => required.includes(f);
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} name="doi" label="DOI" placeholder="10.xxxx/xxxxx" required={req('doi')} disabled={disabled} />
        <TextField form={form} name="pages" label="Pages" required={req('pages')} disabled={disabled} />
        <TextField form={form} name="volume" label="Volume" required={req('volume')} disabled={disabled} />
        <TextField form={form} name="issue" label="Issue" required={req('issue')} disabled={disabled} />
        <TextField form={form} name="license" label="Licence" required={req('license')} disabled={disabled} />
        <TextField form={form} name="copyright" label="Copyright" required={req('copyright')} disabled={disabled} />
      </div>
      <TextareaField form={form} name="citation" label="Citation text" rows={3} required={req('citation')} disabled={disabled} />
      <LoadingButton type="submit" loading={save.isPending} disabled={disabled}>Save metadata</LoadingButton>
    </form>
  );
}

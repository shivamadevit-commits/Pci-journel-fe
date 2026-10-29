'use client';

import { useId, useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';

export const MAX_UPLOAD_MB = 25;

interface Props {
  label: string;
  value: File | null | undefined;
  onChange: (f: File | null) => void;
  /** e.g. ".docx" — the server still sniffs real content and is authoritative. */
  accept?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxMb?: number;
}

export function FileInput({ label, value, onChange, accept, description, error, required, disabled, maxMb = MAX_UPLOAD_MB }: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const tooBig = !!value && value.size > maxMb * 1024 * 1024;

  return (
    <Field data-invalid={!!error || tooBig}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span aria-hidden className="text-destructive">*</span>}
      </FieldLabel>
      <input
        ref={ref}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{value.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{(value.size / 1024 / 1024).toFixed(2)} MB</span>
          </span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${value.name}`} disabled={disabled} onClick={() => { onChange(null); if (ref.current) ref.current.value = ''; }}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-auto justify-start gap-2 border-dashed py-3" disabled={disabled} onClick={() => ref.current?.click()}>
          <Upload className="size-4" aria-hidden /> Choose file{accept ? ` (${accept})` : ''}
        </Button>
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      {tooBig && <FieldError>File is larger than {maxMb} MB.</FieldError>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

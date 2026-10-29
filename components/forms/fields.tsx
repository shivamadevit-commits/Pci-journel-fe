'use client';

import { Controller, get, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Input/output types may differ (zod transforms), so the transformed-values generics are left open.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm<T extends FieldValues> = UseFormReturn<T, any, any>;

interface BaseProps<T extends FieldValues> {
  form: AnyForm<T>;
  name: Path<T>;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

const errorOf = <T extends FieldValues>(form: AnyForm<T>, name: Path<T>) => get(form.formState.errors, name) as { message?: string } | undefined;

export function TextField<T extends FieldValues>({ form, name, label, description, required, className, ...input }: BaseProps<T> & Omit<React.ComponentProps<'input'>, 'name' | 'form'>) {
  const err = errorOf(form, name);
  const id = `f-${name}`;
  return (
    <Field data-invalid={!!err} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span aria-hidden className="text-destructive">*</span>}
      </FieldLabel>
      <Input id={id} aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} {...input} {...form.register(name, input.type === 'number' ? { valueAsNumber: true } : undefined)} />
      {description && <FieldDescription>{description}</FieldDescription>}
      {err && <FieldError id={`${id}-err`}>{err.message}</FieldError>}
    </Field>
  );
}

export function TextareaField<T extends FieldValues>({ form, name, label, description, required, className, ...input }: BaseProps<T> & Omit<React.ComponentProps<'textarea'>, 'name' | 'form'>) {
  const err = errorOf(form, name);
  const id = `f-${name}`;
  return (
    <Field data-invalid={!!err} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span aria-hidden className="text-destructive">*</span>}
      </FieldLabel>
      <Textarea id={id} rows={4} aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} {...input} {...form.register(name)} />
      {description && <FieldDescription>{description}</FieldDescription>}
      {err && <FieldError id={`${id}-err`}>{err.message}</FieldError>}
    </Field>
  );
}

export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  className,
  options,
  placeholder = 'Select…',
}: BaseProps<T> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const err = errorOf(form, name);
  const id = `f-${name}`;
  return (
    <Field data-invalid={!!err} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span aria-hidden className="text-destructive">*</span>}
      </FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={(field.value as string) || undefined} onValueChange={field.onChange}>
            <SelectTrigger id={id} className="w-full" aria-invalid={!!err}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {err && <FieldError>{err.message}</FieldError>}
    </Field>
  );
}

export function CheckboxField<T extends FieldValues>({ form, name, label, description, className }: BaseProps<T>) {
  const err = errorOf(form, name);
  const id = `f-${name}`;
  return (
    <Field orientation="horizontal" data-invalid={!!err} className={className}>
      <Controller control={form.control} name={name} render={({ field }) => <Checkbox id={id} checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={!!err} />} />
      <div className="space-y-1">
        <FieldLabel htmlFor={id} className="font-normal">
          {label}
        </FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {err && <FieldError>{err.message}</FieldError>}
      </div>
    </Field>
  );
}

export function SwitchField<T extends FieldValues>({ form, name, label, description, className }: BaseProps<T>) {
  const id = `f-${name}`;
  return (
    <Field orientation="horizontal" className={className}>
      <Controller control={form.control} name={name} render={({ field }) => <Switch id={id} checked={!!field.value} onCheckedChange={field.onChange} />} />
      <div className="space-y-1">
        <FieldLabel htmlFor={id} className="font-normal">
          {label}
        </FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </div>
    </Field>
  );
}

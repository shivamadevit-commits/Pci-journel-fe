'use client';

import type { z } from 'zod';
import { FieldError } from '@/components/ui/field';
import { firstError } from '@/lib/validation';

/**
 * Inline error for state-driven inputs that are not part of a react-hook-form form.
 * Shows the shared schema's message once the user has typed something; use `firstError(schema, value)`
 * on the same schema to gate the submit button.
 */
export function FieldValidation({ schema, value, id }: { schema: z.ZodType; value: unknown; id?: string }) {
  const message = value === '' || value === undefined ? undefined : firstError(schema, value);
  return message ? <FieldError id={id}>{message}</FieldError> : null;
}

'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '@/lib/api-client';
import type { ApiResult } from '@/types/api';

/** Maps backend field-level validation errors (authoritative) onto the form. Returns true if any were applied. */
export function applyApiErrors<T extends FieldValues>(form: UseFormReturn<T> | undefined, err: unknown): boolean {
  if (!form || !(err instanceof ApiError) || err.errors.length === 0) return false;
  let applied = false;
  for (const e of err.errors) {
    const field = e.field.replace(/^(metadata|body|params|query)\./, '');
    if (field in form.getValues() || field.includes('.')) {
      form.setError(field as FieldPath<T>, { type: 'server', message: e.message });
      applied = true;
    }
  }
  return applied;
}

interface ActionOptions<V, R> {
  fn: (vars: V) => Promise<ApiResult<R>>;
  /** Toast shown on success; defaults to the API's message. Pass false to stay silent. */
  success?: string | false;
  invalidate?: QueryKey[];
  form?: UseFormReturn<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onSuccess?: (result: R, vars: V) => void;
}

/** useMutation + consistent toasts, cache invalidation and server-validation mapping. `isPending` guards double-submit. */
export function useAction<V = void, R = unknown>({ fn, success, invalidate = [], form, onSuccess }: ActionOptions<V, R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (res, vars) => {
      if (success !== false) toast.success(success ?? res.message);
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      onSuccess?.(res.data, vars);
    },
    onError: (err) => {
      const mapped = applyApiErrors(form, err);
      toast.error(mapped ? 'Please correct the highlighted fields.' : errorMessage(err), {
        description: err instanceof ApiError && err.requestId && err.status >= 500 ? `Ref: ${err.requestId}` : undefined,
      });
    },
  });
}

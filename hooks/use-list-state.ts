'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Defaults = Record<string, string>;

/**
 * Keeps list state (page, search, filters, sort) in the URL so lists are shareable and survive refresh.
 * Setting any filter resets the page to 1.
 */
export function useListState<D extends Defaults>(defaults: D) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const state = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(defaults)) out[k] = sp.get(k) ?? defaults[k]!;
    return out as D;
  }, [sp, defaults]);

  const set = useCallback(
    (patch: Partial<Record<keyof D, string>>, keepPage = false) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || v === defaults[k]) next.delete(k);
        else next.set(k, v);
      }
      if (!keepPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname, defaults],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  return { state, set, reset, page: Number(state.page ?? 1) || 1 };
}

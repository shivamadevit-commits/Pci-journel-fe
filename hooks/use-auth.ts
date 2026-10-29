'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { SessionUser } from '@/types/domain';

export const ME_KEY = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await api.get<SessionUser>('/auth/me')).data,
    staleTime: 60_000,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* the cookies are cleared by the proxy regardless */
    }
    qc.clear();
    // Full navigation on purpose: discards all in-memory client state of the ended session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login';
  };
}

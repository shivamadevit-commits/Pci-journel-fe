'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface Features {
  paymentEnabled: boolean;
}

/** Portal feature flags. Payment is treated as off until the server says otherwise, so disabled UI never flashes. */
export function useFeatures() {
  const q = useQuery({
    queryKey: ['config', 'features'],
    queryFn: async () => (await api.get<Features>('/config/features')).data,
    staleTime: 60_000,
  });
  return { paymentEnabled: q.data?.paymentEnabled ?? false, isLoading: q.isLoading };
}

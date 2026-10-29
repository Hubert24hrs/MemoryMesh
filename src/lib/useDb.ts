import { QueryClient, useQuery, type QueryKey } from '@tanstack/react-query';

import { onDataChanged } from '../db/changes';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always', staleTime: Infinity, retry: false },
  },
});

// Every local query lives under the 'db' prefix and refetches on any write.
onDataChanged(() => {
  void queryClient.invalidateQueries({ queryKey: ['db'] });
});

export function useDb<T>(key: QueryKey, fn: () => Promise<T>, enabled = true) {
  return useQuery({ queryKey: ['db', ...key], queryFn: fn, enabled });
}

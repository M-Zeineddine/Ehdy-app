import { QueryClient } from '@tanstack/react-query';

// Standalone so the auth stores can reach it: clearAuth() must wipe cached
// server data on logout or the next account on the device is served the
// previous account's cache.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

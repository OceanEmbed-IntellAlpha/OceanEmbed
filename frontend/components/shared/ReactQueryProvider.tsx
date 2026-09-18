'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * App-level TanStack Query provider.
 * Mounted once in the root layout so both the landing page and the
 * Explorer console share the same QueryClient and cache.
 *
 * The QueryClient is created inside useState so each Next.js server
 * render creates a fresh instance while the same instance is reused
 * across client-side navigations.
 */
export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't refetch on window focus for the 3D explorer — it causes
            // unnecessary re-renders while the user is interacting with the globe.
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60 * 2, // 2 min default
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

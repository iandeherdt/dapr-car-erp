'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { eventBus } from '@car-erp/event-bus';

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    const unsubscribe = eventBus.on('navigate', ({ path }) => {
      router.push(path);
    });
    return unsubscribe;
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

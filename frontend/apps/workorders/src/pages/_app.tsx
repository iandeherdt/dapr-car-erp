import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30 * 1000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6">
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  );
}

import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/sidebar';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <div className="p-6">
            <Component {...pageProps} />
          </div>
        </main>
      </div>
    </Providers>
  );
}

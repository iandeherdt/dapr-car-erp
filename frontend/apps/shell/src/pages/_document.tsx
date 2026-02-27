import { Html, Head, Main, NextScript } from 'next/document';

/**
 * _document is rendered server-side on every request.
 * process.env vars here are read from the running Node.js process at request
 * time — NOT baked in at build time — so the shell can be pointed at different
 * remote URLs by changing env vars and restarting, without a rebuild.
 */
export default function Document() {
  const remoteUrls = {
    customers: process.env.CUSTOMERS_URL ?? 'http://localhost:3001',
    workorders: process.env.WORKORDERS_URL ?? 'http://localhost:3002',
    inventory: process.env.INVENTORY_URL ?? 'http://localhost:3003',
    billing: process.env.BILLING_URL ?? 'http://localhost:3004',
  };

  return (
    <Html lang="en">
      <Head>
        {/*
         * Inject remote URLs before any JS bundle executes.
         * The Module Federation bootstrap reads window.__REMOTE_URLS__ when it
         * initialises the dynamic remote promises (see next.config.mjs).
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__REMOTE_URLS__ = ${JSON.stringify(remoteUrls)};`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

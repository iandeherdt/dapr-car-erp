import { NextFederationPlugin } from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@car-erp/shared-ui', '@car-erp/event-bus', '@car-erp/shared-types'],
  webpack(config, options) {
    if (options.isServer) {
      // On server, mark federated remotes as externals so webpack doesn't try to
      // resolve them (all remote imports use ssr: false so they're never run server-side)
      const existingExternals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          if (/^(customers|workorders|inventory|billing)\//.test(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    } else {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'shell',
          filename: 'static/chunks/remoteEntry.js',
          remotes: {
            customers: `promise new Promise(resolve => {
              const url = window.__REMOTE_URLS__.customers + '/_next/static/chunks/remoteEntry.js';
              if (window['customers']) { resolve(window['customers']); return; }
              const el = document.createElement('script');
              el.src = url;
              el.onload = () => resolve(window['customers']);
              document.head.appendChild(el);
            })`,
            workorders: `promise new Promise(resolve => {
              const url = window.__REMOTE_URLS__.workorders + '/_next/static/chunks/remoteEntry.js';
              if (window['workorders']) { resolve(window['workorders']); return; }
              const el = document.createElement('script');
              el.src = url;
              el.onload = () => resolve(window['workorders']);
              document.head.appendChild(el);
            })`,
            inventory: `promise new Promise(resolve => {
              const url = window.__REMOTE_URLS__.inventory + '/_next/static/chunks/remoteEntry.js';
              if (window['inventory']) { resolve(window['inventory']); return; }
              const el = document.createElement('script');
              el.src = url;
              el.onload = () => resolve(window['inventory']);
              document.head.appendChild(el);
            })`,
            billing: `promise new Promise(resolve => {
              const url = window.__REMOTE_URLS__.billing + '/_next/static/chunks/remoteEntry.js';
              if (window['billing']) { resolve(window['billing']); return; }
              const el = document.createElement('script');
              el.src = url;
              el.onload = () => resolve(window['billing']);
              document.head.appendChild(el);
            })`,
          },
          shared: {
            react: { singleton: true, requiredVersion: false, eager: true },
            'react-dom': { singleton: true, requiredVersion: false, eager: true },
            '@tanstack/react-query': { singleton: true, requiredVersion: false, eager: true },
            '@car-erp/shared-types': { singleton: true },
            '@car-erp/shared-ui': { singleton: true },
            '@car-erp/event-bus': { singleton: true },
          },
        })
      );
    }
    return config;
  },
};

export default nextConfig;

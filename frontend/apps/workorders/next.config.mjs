import { NextFederationPlugin } from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@car-erp/shared-ui', '@car-erp/event-bus', '@car-erp/shared-types'],
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'workorders',
          filename: 'static/chunks/remoteEntry.js',
          exposes: {
            './pages/WorkOrderList': './src/components/workorder-list-page.tsx',
            './pages/WorkOrderDetail': './src/components/workorder-detail-page.tsx',
            './pages/WorkOrderNew': './src/components/workorder-new-page.tsx',
          },
          shared: {
            react: { singleton: true, requiredVersion: false },
            'react-dom': { singleton: true, requiredVersion: false },
            '@tanstack/react-query': { singleton: true, requiredVersion: false },
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

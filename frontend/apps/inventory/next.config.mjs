import { NextFederationPlugin } from '@module-federation/nextjs-mf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@car-erp/shared-ui', '@car-erp/event-bus', '@car-erp/shared-types'],
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'inventory',
          filename: 'static/chunks/remoteEntry.js',
          exposes: {
            './pages/PartsList': './src/components/parts-list-page.tsx',
            './pages/PartDetail': './src/components/part-detail-page.tsx',
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

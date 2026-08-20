/**
 * ============================================================================
 * FILE: apps/web/next.config.js
 * PURPOSE: Next.js application configuration integrating Progressive Web App (PWA)
 *          caching rules, Supabase remote image domains, and server action payload limits.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - withPWA (Plugin): Injects service worker and runtime caching for offline support.
 * - nextConfig (NextConfig): React strict mode, experimental server actions, image patterns.
 * 
 * RELATION TO APP:
 * - Application build and runtime environment configuration.
 * ============================================================================
 */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/, /server-reference-manifest\.json$/, /server-reference-manifest\.js$/],
  runtimeCaching: [
    {
      // Never cache anything under the whistleblower inbox — safety-critical,
      // must always hit the network, and must never be recoverable from a
      // shared/public device cache.
      urlPattern: /^\/(whistleblower|api\/whistleblower)/,
      handler: 'NetworkOnly'
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }
  }
};

module.exports = withPWA(nextConfig);

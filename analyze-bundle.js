const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  sw: '/sw.js',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/api\/(foods|medical)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  webpack: (config, { isServer }) => {
    // 優化 bundle 大小
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // 醫療相關功能分離
          medical: {
            name: 'medical',
            chunks: 'all',
            test: /[\\/]lib[\\/](medical|ai)[\\/]/,
            priority: 20,
          },
          // Supabase 和 DB 操作分離
          database: {
            name: 'database',
            chunks: 'all',
            test: /[\\/]lib[\\/]supabase[\\/]/,
            priority: 15,
          },
          // UI 組件分離
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]components[\\/]ui[\\/]/,
            priority: 10,
          },
          // 第三方庫分離
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 5,
          },
        },
      };
    }

    return config;
  },
  // 性能優化配置
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // 圖片優化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
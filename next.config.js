const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 365 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 365 days
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-audio-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-data-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: ({ request }) => request.headers.get('accept')?.includes('text/html'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    // Diet Daily API 快取策略
    {
      urlPattern: /^.*\/api\/foods.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'food-database-api',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days - 食物資料庫變化較少
        },
        cacheKeyWillBeUsed: async ({ request }) => {
          // 移除查詢參數中的時間戳，提高快取命中率
          const url = new URL(request.url);
          url.searchParams.delete('_t');
          return url.toString();
        }
      }
    },
    {
      urlPattern: /^.*\/api\/history.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'food-history-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 // 1 hour - 歷史資料需要較新
        },
        networkTimeoutSeconds: 3
      }
    },
    {
      urlPattern: /^.*\/api\/medical\/profile.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'medical-profile-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 3
      }
    },
    {
      urlPattern: /^.*\/api\/medical\/symptoms.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'symptoms-api',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 2 * 60 * 60 // 2 hours - 症狀資料需要及時更新
        },
        networkTimeoutSeconds: 3
      }
    },
    {
      urlPattern: /^.*\/api\/reports.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'reports-api',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 6 * 60 * 60 // 6 hours
        },
        networkTimeoutSeconds: 5
      }
    },
    // 離線頁面處理
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60
        },
        networkTimeoutSeconds: 3
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: []
  },
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't try to load Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https:; connect-src 'self' https://sheets.googleapis.com https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com; media-src 'self'; object-src 'none'; child-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ];
  }
};

module.exports = withPWA(nextConfig);
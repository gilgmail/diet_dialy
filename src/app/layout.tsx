import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import './globals.css';

// 動態導入離線指示器以避免 SSR 問題
const OfflineIndicator = dynamic(
  () => import('@/components/common/OfflineIndicator'),
  { ssr: false }
);

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  colorScheme: 'light dark'
};

export const metadata: Metadata = {
  title: {
    default: 'Diet Daily - Medical Food Tracker',
    template: '%s | Diet Daily'
  },
  description: 'Medical-grade food and symptom tracking for IBD, chemotherapy, allergies, and IBS patients. Track your diet, monitor symptoms, and manage your health with precision.',
  keywords: [
    'medical food tracker',
    'IBD tracker',
    'IBS symptoms',
    'chemotherapy nutrition',
    'food allergy tracker',
    'symptom diary',
    'medical diet app',
    'health monitoring',
    'Taiwan healthcare',
    'Hong Kong medical app'
  ],
  authors: [{ name: 'Diet Daily Team' }],
  creator: 'Diet Daily',
  publisher: 'Diet Daily',
  category: 'Medical',
  classification: 'Health & Medical',
  robots: {
    index: false, // Medical app - privacy first
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Diet Daily',
    startupImage: [
      {
        url: '/splash/iphone5_splash.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/splash/iphone6_splash.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/splash/iphoneplus_splash.png',
        media: '(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/splash/iphonex_splash.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/splash/iphonexr_splash.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/splash/iphonexsmax_splash.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)'
      },
      {
        url: '/splash/ipad_splash.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/splash/ipadpro1_splash.png',
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/splash/ipadpro3_splash.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)'
      },
      {
        url: '/splash/ipadpro2_splash.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)'
      }
    ]
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    url: false
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'msapplication-TileColor': '#2563eb',
    'msapplication-config': '/browserconfig.xml'
  }
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA theme color */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-navbutton-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Preconnect to improve performance */}

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Medical app specific meta tags */}
        <meta name="medical-app" content="true" />
        <meta name="health-category" content="nutrition-tracking" />
        <meta name="privacy-sensitive" content="true" />
        <meta name="data-protection" content="gdpr-compliant" />

        {/* Accessibility */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          'supports-[height:100dvh]:min-h-[100dvh]', // Dynamic viewport height
          inter.variable
        )}
      >
        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        {/* Screen reader announcements */}
        <div
          id="announcements"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Main app content */}
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    console.log('SW registered: ', registration);
                  })
                  .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                  });
              }
            `
          }}
        />

        {/* Install prompt handling */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                // 不阻止預設行為，讓瀏覽器顯示安裝橫幅
                // e.preventDefault();
                deferredPrompt = e;
                console.log('PWA install prompt available');
              });

              // 處理用戶安裝選擇
              window.addEventListener('appinstalled', (e) => {
                console.log('PWA was installed');
                deferredPrompt = null;
              });
            `
          }}
        />
      </body>
    </html>
  );
}
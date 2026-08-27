import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import BootGate from '@/components/BootGate';
import type { Metadata, Viewport } from 'next';
import { NotificationProvider } from '@/components/NotificationProvider';
import ToastContainer from '@/components/ToastContainer';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563EB',
};

export const metadata: Metadata = {
  title: 'AaharSetu — Campus Canteen Platform',
  description: 'Smart Canteen Order Management & Institutional Procurement Platform for Educational Institutions.',
  keywords: 'canteen management, order ERP, food ordering, college canteen, AaharSetu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AaharSetu',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AharSetu" />
        <meta name="theme-color" content="#2563EB" />
        
        {/* Preconnect to Font Origins for Zero Render-Blocking Delay */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* High-priority LCP Background Image Preload */}
        <link
          rel="preload"
          as="image"
          href="/images/campus_dining_hero_v3.webp"
          type="image/webp"
          // @ts-ignore
          fetchPriority="high"
        />

        {/* Non-render-blocking asynchronous font stylesheet */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          media="print"
          // @ts-ignore
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          />
        </noscript>
      </head>
      <body>
        <I18nProvider>
          <NotificationProvider>
            <BootGate>
              <main id="main-content" style={{ minHeight: '100vh', width: '100%' }}>
                {children}
              </main>
              <ToastContainer />
            </BootGate>
          </NotificationProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

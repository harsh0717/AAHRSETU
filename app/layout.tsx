import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import BootGate from '@/components/BootGate';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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

import { NotificationProvider } from '@/components/NotificationProvider';
import ToastContainer from '@/components/ToastContainer';
import RoleSwitcherBar from '@/components/RoleSwitcherBar';

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
        
        {/* Preconnect to Font domains for zero-latency DNS & TLS negotiation */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />

        {/* High-priority asset preloading to prevent LCP discovery delay */}
        <link rel="preload" as="image" href="/images/food_login_bg.webp" type="image/webp" />
        <link rel="preload" as="image" href="/images/logo.png" type="image/png" />
      </head>
      <body>
        <I18nProvider>
          <NotificationProvider>
            <BootGate>
              {children}
              <ToastContainer />
              <RoleSwitcherBar />
            </BootGate>
          </NotificationProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

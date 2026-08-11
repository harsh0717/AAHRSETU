import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563EB',
};

export const metadata: Metadata = {
  title: 'AharSetu — Campus Canteen Platform',
  description: 'Smart Canteen Order Management & Institutional Procurement Platform for Educational Institutions.',
  keywords: 'canteen management, order ERP, food ordering, college canteen, AharSetu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AharSetu',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/aharsetu_official_logo.png" />
        <link rel="apple-touch-icon" href="/images/aharsetu_official_logo.png" />
      </head>
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

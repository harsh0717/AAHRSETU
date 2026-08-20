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
        <link rel="icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
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

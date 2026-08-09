import './globals.css';
import { I18nProvider } from '@/lib/i18n';

export const metadata = {
  title: 'AharSetu — Canteen Order Management ERP',
  description: 'Smart Canteen Order Management System for Educational Institutions. Streamline food orders, approvals, and billing.',
  keywords: 'canteen management, order ERP, food ordering, college canteen',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

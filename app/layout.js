import { Outfit } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'AharSetu — Canteen Order Management ERP',
  description: 'Smart Canteen Order Management System for Educational Institutions. Streamline food orders, approvals, and billing.',
  keywords: 'canteen management, order ERP, food ordering, college canteen',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.variable}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

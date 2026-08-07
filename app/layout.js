import './globals.css';

export const metadata = {
  title: 'AharSetu — Canteen Order Management ERP',
  description: 'A complete canteen order management system for institutions. Streamline tea, lunch and refreshment orders through multi-level approval workflows.',
  keywords: 'canteen management, order management, ERP, institution catering',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

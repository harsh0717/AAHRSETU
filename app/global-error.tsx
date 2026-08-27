'use client';

import BrandLogo from '@/components/BrandLogo';

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F172A',
          color: '#F8FAFC',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '90%',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <BrandLogo size={52} />
          </div>

          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.5rem',
            }}
          >
            ⚠️
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F8FAFC', margin: '0 0 8px' }}>
            Application Framework Error
          </h2>

          <p style={{ fontSize: '0.86rem', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 24px' }}>
            A critical error occurred in the root layout layer. Click below to reload the application.
          </p>

          <button
            onClick={() => reset()}
            style={{
              padding: '12px 26px',
              borderRadius: '12px',
              background: '#16A34A',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
            }}
          >
            🔄 Reload AharSetu
          </button>
        </div>
      </body>
    </html>
  );
}

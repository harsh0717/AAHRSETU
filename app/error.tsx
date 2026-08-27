'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import AppIcon from '@/components/ui/AppIcon';
import UiverseButton from '@/components/ui/UiverseButton';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to console or telemetry service
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F172A 0%, #1E1B4B 40%, #06281E 100%)',
        color: '#F8FAFC',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '20%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '20%',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
          <BrandLogo size={52} />
        </div>

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
          }}
        >
          <AppIcon name="rejected" size={32} color="#EF4444" strokeWidth={2.2} />
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.16)',
            color: '#F87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          System Runtime Interruption
        </span>

        <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#F8FAFC', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Something went wrong
        </h2>

        <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.55, margin: '0 0 24px' }}>
          An unexpected error occurred while executing the campus hospitality protocol. Your session data and pending requisitions are safe.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '12px',
              background: '#16A34A',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <span>🔄</span> Try Again
          </button>

          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <span>🏠</span> Return to Login
          </Link>
        </div>

        {/* Expandable Technical Details */}
        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showDetails ? '▲ Hide Diagnostics' : '▼ View Technical Diagnostics'}
          </button>

          {showDetails && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                textAlign: 'left',
                fontSize: '0.74rem',
                fontFamily: 'monospace',
                color: '#CBD5E1',
                maxHeight: '140px',
                overflowY: 'auto',
                wordBreak: 'break-all',
              }}
            >
              <div><strong>Message:</strong> {error.message || 'Unknown runtime exception'}</div>
              {error.digest && <div style={{ marginTop: '4px' }}><strong>Digest:</strong> {error.digest}</div>}
              {error.stack && <div style={{ marginTop: '6px', color: '#94A3B8', fontSize: '0.68rem' }}>{error.stack}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

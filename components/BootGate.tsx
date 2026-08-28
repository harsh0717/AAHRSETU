'use client';
import React, { useState, useEffect, useRef } from 'react';
import { initializeApplication } from '@/lib/auth';

export default function BootGate({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState(false);
  const initializedRef = useRef(false);

  const performBoot = async () => {
    setError(false);
    try {
      await initializeApplication();
    } catch (err) {
      console.warn('[BOOT] App initialization fallback in offline/resilient mode:', err);
    }
  };

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      performBoot();
    }
  }, []);

  return (
    <>
      {children}
      {error && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              background: 'var(--surface-0)',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '360px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              border: '1px solid var(--gray-200, #E2E8F0)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔌</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E3A6F', margin: '0 0 8px 0' }}>
              Unable to Connect
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--gray-500, #64748B)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              We are having trouble connecting to the AaharSetu server. Please check your internet connection and try again.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={performBoot}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}
              >
                🔄 Retry Connection
              </button>
              <button
                onClick={() => setError(false)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--gray-500, #64748B)',
                  border: '1px solid var(--gray-300, #CBD5E1)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continue in Offline Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

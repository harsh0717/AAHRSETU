'use client';
import React, { useState, useEffect, useRef } from 'react';
import { initializeApplication } from '@/lib/auth';
import BrandLogo from './BrandLogo';

export default function BootGate({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const initializedRef = useRef(false);

  const performBoot = async () => {
    setError(false);
    
    // 1. Min 3 second splash timer
    const timer = new Promise((resolve) => setTimeout(resolve, 3000));
    
    // 2. Application initialization task
    const init = (async () => {
      try {
        const user = await initializeApplication();
        return user;
      } catch (err) {
        console.error('[BOOT] Error during app initialization:', err);
        throw err;
      }
    })();

    // 3. Overall timeout of 10s to prevent hanging on splash
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Initialization timed out')), 10000)
    );

    try {
      // Race the initialization against a 10-second timeout, but wait at least 3 seconds
      await Promise.race([
        Promise.all([timer, init]),
        timeout
      ]);
      setBooted(true);
    } catch (err) {
      console.error('[BOOT] Boot process failed:', err);
      setError(true);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      performBoot();
    }
  }, []);

  if (booted) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      {error ? (
        // Recovery State Card
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px 24px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid #E2E8F0',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔌</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E3A6F', margin: '0 0 8px 0' }}>
            Unable to Connect
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            We are having trouble connecting to the AharSetu server. Please check your internet connection and try again.
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
              onClick={() => setBooted(true)}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Skip to Offline Mode
            </button>
          </div>
        </div>
      ) : (
        // Splash Loader Presentation
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Logo container with scale/fade animation */}
          <div
            className="splash-logo-container"
            style={{
              animation: reducedMotion 
                ? 'simpleFadeIn 0.8s ease-out forwards' 
                : 'logoIntro 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px',
              position: 'relative'
            }}
          >
            <BrandLogo size={80} variant="icon" />
            
            {/* Glossy shine overlay sweep effect */}
            {!reducedMotion && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  transform: 'skewX(-25deg) translateX(-150%)',
                  animation: 'shimmerSweep 2.5s infinite ease-in-out',
                  animationDelay: '1.2s'
                }}
              />
            )}
          </div>

          {/* AharSetu Wordmark with letter-spacing & fade animation */}
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#1E3A6F',
              letterSpacing: '-0.03em',
              margin: '0 0 4px 0',
              opacity: 0,
              animation: 'fadeIn 0.6s ease-out forwards',
              animationDelay: '1.2s',
              fontFamily: "'Outfit', 'Inter', sans-serif"
            }}
          >
            Ahar<span style={{ color: '#2563EB' }}>Setu</span>
          </h1>

          <p
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#64748B',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              margin: 0,
              opacity: 0,
              animation: 'fadeIn 0.6s ease-out forwards',
              animationDelay: '1.5s'
            }}
          >
            Campus Food · Connected
          </p>

          {/* Gentle pulse progress status indicator */}
          <div
            style={{
              marginTop: '48px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#3B82F6',
              animation: 'pulseGently 1.8s infinite ease-in-out',
              opacity: 0,
              animationDelay: '0.5s',
              animationFillMode: 'forwards'
            }}
          >
            Initializing Platform...
          </div>
        </div>
      )}

      {/* Global Splash Animations Styling */}
      <style>{`
        @keyframes logoIntro {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes simpleFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmerSweep {
          0% { transform: skewX(-25deg) translateX(-150%); }
          50% { transform: skewX(-25deg) translateX(150%); }
          100% { transform: skewX(-25deg) translateX(150%); }
        }
        @keyframes pulseGently {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}

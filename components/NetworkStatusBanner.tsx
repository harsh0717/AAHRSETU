'use client';

import React, { useState, useEffect } from 'react';

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        maxWidth: '92vw',
        animation: 'slideDown 0.25s ease-out'
      }}
    >
      {!isOnline ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#FFFFFF',
            backdropFilter: 'blur(12px)',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
            fontSize: '0.78rem',
            fontWeight: 800,
            border: '1.5px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FCA5A5',
              boxShadow: '0 0 8px #FFFFFF',
              display: 'inline-block'
            }}
          />
          <span>📡 Offline Mode — Changes saved locally & will sync when reconnected</span>
        </div>
      ) : showRestored ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#FFFFFF',
            backdropFilter: 'blur(12px)',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            fontSize: '0.78rem',
            fontWeight: 800,
            border: '1.5px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <span>✓ Connection Restored — Live sync active</span>
        </div>
      ) : null}
    </div>
  );
}

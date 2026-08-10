'use client';
import { useState, useEffect } from 'react';
import { requestNotificationPermission, registerServiceWorker } from '@/lib/push';
import { getSession } from '@/lib/auth';

export default function PushPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    const session = getSession();
    if (!session) return;
    
    // Only prompt if Notification API is supported and permission is 'default'
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const dismissed = localStorage.getItem(`aharsetu_push_dismissed_${session.id}`);
      if (!dismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  async function handleEnable() {
    const granted = await requestNotificationPermission();
    setShowPrompt(false);
    if (granted) {
      alert('🔔 Notifications enabled successfully! You will receive instant order alerts.');
    }
  }

  function handleDismiss() {
    const session = getSession();
    if (session) {
      localStorage.setItem(`aharsetu_push_dismissed_${session.id}`, 'true');
    }
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      maxWidth: '420px',
      margin: '0 auto',
      background: '#0F172A',
      color: '#F8FAFC',
      padding: '16px 20px',
      borderRadius: '16px',
      boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
      zIndex: 9990,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      borderLeft: '5px solid #10B981',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '1.5rem' }}>📲</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '2px' }}>
            Enable Mobile Push Notifications
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.4' }}>
            Receive instant alerts on your mobile device when new requisitions, approvals, or canteen orders arrive.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '0.78rem',
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Not Now
        </button>
        <button
          onClick={handleEnable}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '0.78rem',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          Enable Notifications
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

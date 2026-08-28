'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  orderId?: string;
  role?: string;
  duration?: number;
  timestamp: number;
}

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; badgeBg: string; badgeText: string; icon: string }> = {
  principal: { bg: '#EEF2FF', border: '#818CF8', text: '#312E81', badgeBg: '#4F46E5', badgeText: '#FFFFFF', icon: '🎓' },
  dcr: { bg: '#F0F9FF', border: '#38BDF8', text: '#0C4A6E', badgeBg: '#0284C7', badgeText: '#FFFFFF', icon: '📋' },
  coordinator: { bg: '#EFF6FF', border: '#60A5FA', text: '#1E3A8A', badgeBg: '#2563EB', badgeText: '#FFFFFF', icon: '👤' },
  vendor: { bg: '#ECFDF5', border: '#34D399', text: '#064E3B', badgeBg: '#059669', badgeText: '#FFFFFF', icon: '🍽️' },
  admin: { bg: '#F5F3FF', border: '#A78BFA', text: '#4C1D95', badgeBg: '#7C3AED', badgeText: '#FFFFFF', icon: '⚙️' },
  system: { bg: '#F8FAFC', border: '#94A3B8', text: '#0F172A', badgeBg: '#475569', badgeText: '#FFFFFF', icon: '🔔' }
};

export default function ToastContainer() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id)!);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id' | 'timestamp'> & { id?: string }) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const duration = toast.duration || 5000;
    const newToast: ToastItem = {
      ...toast,
      id,
      duration,
      timestamp: Date.now()
    };

    setToasts((prev) => {
      // Avoid duplicate toasts with exact same message within 2 seconds
      if (prev.some((t) => t.message === newToast.message && Date.now() - t.timestamp < 2000)) {
        return prev;
      }
      // Keep up to 4 toasts
      return [newToast, ...prev.slice(0, 3)];
    });

    // Schedule auto-dismiss
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    timersRef.current.set(id, timer);

    // Audio chime
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);
      }
    } catch {}
  }, [removeToast]);

  useEffect(() => {
    // Listen for custom aharsetu_toast events
    const handleToastEvent = (e: any) => {
      if (e.detail) {
        addToast({
          title: e.detail.title || 'Notification',
          message: e.detail.message || '',
          type: e.detail.type,
          orderId: e.detail.order_id || e.detail.orderId,
          role: e.detail.role || e.detail.recipient_role || 'system',
          duration: e.detail.duration || 5000
        });
      }
    };

    // Listen for notification updates
    const handleNotificationEvent = (e: any) => {
      if (e.detail) {
        addToast({
          title: e.detail.title || 'Order Update',
          message: e.detail.message || '',
          type: e.detail.type,
          orderId: e.detail.order_id,
          role: e.detail.recipient_role || 'system',
          duration: 5500
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_toast', handleToastEvent);
      window.addEventListener('aharsetu_notification', handleNotificationEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_toast', handleToastEvent);
        window.removeEventListener('aharsetu_notification', handleNotificationEvent);
      }
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const theme = ROLE_COLORS[(toast.role || 'system').toLowerCase()] || ROLE_COLORS.system;
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1.5px solid ${theme.border}`,
              borderLeft: `5px solid ${theme.badgeBg}`,
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)',
              animation: 'toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              overflow: 'hidden',
              cursor: toast.orderId ? 'pointer' : 'default',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onClick={() => {
              if (toast.orderId) {
                router.push(`/order/${toast.orderId}`);
                removeToast(toast.id);
              }
            }}
          >
            {/* Top row: Role Icon + Title + Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>{theme.icon}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: theme.badgeBg,
                    color: theme.badgeText,
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  {toast.role || 'System'}
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--gray-900, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {toast.title}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  lineHeight: 1,
                }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Message Body */}
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-700, #334155)', lineHeight: 1.4, wordBreak: 'break-word' }}>
              {toast.message}
            </p>

            {/* Order Action Footer if applicable */}
            {toast.orderId && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.badgeBg }}>
                  🔗 View Requisition {toast.orderId}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Click to open →</span>
              </div>
            )}

            {/* Progress bar countdown */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                background: theme.badgeBg,
                width: '100%',
                animation: `toastCountdown ${toast.duration || 5000}ms linear forwards`,
              }}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(120%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toastCountdown {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

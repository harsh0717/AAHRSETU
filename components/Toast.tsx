'use client';
import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  if (toastListener) {
    toastListener({ id: String(Date.now()), type, message });
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const bg = t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : t.type === 'warning' ? '#F59E0B' : '#2563EB';
        const icon = t.type === 'success' ? '✓' : t.type === 'error' ? '✖' : t.type === 'warning' ? '⚠' : 'ℹ';
        return (
          <div key={t.id} style={{
            background: 'white',
            color: '#0F172A',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
            borderLeft: `4px solid ${bg}`,
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            pointerEvents: 'auto',
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: bg, color: 'white', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800
            }}>
              {icon}
            </span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

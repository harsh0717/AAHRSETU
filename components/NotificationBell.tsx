'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/components/NotificationProvider';
import { useI18n } from '@/lib/i18n';
import AppIcon from './ui/AppIcon';

interface NotificationBellProps {
  userId: number;
  role: string;
}

export default function NotificationBell({ userId, role }: NotificationBellProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { notifications: notifs, unreadCount: unread, markAsRead, markAllAsRead, refresh } = useNotification();
  const prevUnreadRef = useRef(unread);

  // Trigger pulse micro-animation when unread count increases
  useEffect(() => {
    if (unread > prevUnreadRef.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unread;
  }, [unread]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleToast(e: Event) {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.message) {
        setToastMessage(customEvent.detail.message);
        refresh();
        setTimeout(() => setToastMessage(null), 4500);
      }
    }
    window.addEventListener('aharsetu_toast', handleToast);
    return () => window.removeEventListener('aharsetu_toast', handleToast);
  }, [refresh]);

  async function handleMarkAll() {
    await markAllAsRead();
  }

  async function handleRead(id: string) {
    await markAsRead(id);
  }

  const TYPE_ICONS: Record<string, string> = {
    new_order:    '📋',
    approved:     '✅',
    rejected:     '❌',
    modification: '🔄',
    bill:         '🧾',
    info:         '💬',
  };

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 500 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid var(--gray-200)',
          borderRadius: '50%',
          width: '36px', height: '36px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem',
          position: 'relative',
          transition: 'all 0.2s',
          animation: pulse ? 'pulse-ring 1s infinite' : 'none'
        }}
        className="notif-bell-btn"
      >
        <AppIcon name="notifications" size={18} color="var(--gray-700)" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: 'var(--color-danger, #EF4444)',
            color: 'white', fontSize: '0.65rem', fontWeight: 800,
            borderRadius: '10px', padding: '1px 6px',
            border: '2px solid var(--surface-0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          background: 'var(--surface-0)', border: '1px solid var(--gray-200)',
          borderRadius: '14px', width: '320px',
          minWidth: '320px', maxWidth: 'none',
          boxShadow: 'var(--shadow-xl, 0 10px 25px -5px rgba(0,0,0,0.2))',
          overflow: 'hidden',
          animation: 'slide-down 0.2s ease-out',
          zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', background: 'var(--surface-1)',
            borderBottom: '1px solid var(--gray-200)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--gray-900)' }}>
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary, #2563EB)',
                  fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, padding: 0
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📭</div>
                <div style={{ fontSize: '0.8rem' }}>No notifications yet</div>
              </div>
            ) : (
              notifs.map((n, idx) => (
                <div
                  key={`${n.id}-${idx}`}
                  onClick={() => {
                    handleRead(n.id);
                    setOpen(false);
                    if (n.route) {
                      router.push(n.route);
                    } else if (role === 'vendor') {
                      router.push('/vendor/orders/incoming');
                    } else if (n.action_url) {
                      router.push(n.action_url);
                    }
                  }}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--gray-200)',
                    background: n.read ? 'var(--surface-0)' : 'rgba(37, 99, 235, 0.08)',
                    cursor: 'pointer',
                    display: 'flex', gap: '10px',
                    transition: 'background 0.15s'
                  }}
                  className="notif-item"
                >
                  <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>
                    {TYPE_ICONS[n.type] || '💬'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: n.read ? 500 : 700,
                      color: n.read ? 'var(--gray-700)' : 'var(--gray-900)',
                      lineHeight: '1.3'
                    }}>
                      {n.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--gray-500)' }}>
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary, #2563EB)', fontWeight: 700 }}>
                        {n.action_label || 'View Details →'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Visual Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'var(--surface-0, #0F172A)', color: 'var(--gray-900, #F8FAFC)', padding: '14px 20px',
          borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem',
          fontWeight: 600, borderLeft: '6px solid #2563EB', border: '1px solid var(--gray-200)', animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>🔔</span>
          <div>{toastMessage}</div>
        </div>
      )}

      {/* Styled animation tags */}
      <style>{`
        .notif-item:hover {
          background: var(--surface-2) !important;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

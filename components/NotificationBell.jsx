'use client';
import { useState, useEffect, useRef } from 'react';
import { getNotificationsForUser, markAllRead, markNotificationRead } from '@/lib/notifications';
import { useI18n } from '@/lib/i18n';

export default function NotificationBell({ userId, role }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const ref = useRef(null);

  function load() {
    if (userId || role) setNotifs(getNotificationsForUser(userId, role));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [userId, role]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  function handleMarkAll() {
    markAllRead(userId, role);
    load();
  }

  function handleRead(id) {
    markNotificationRead(id);
    load();
  }

  const TYPE_ICONS = {
    new_order:    '📋',
    approved:     '✅',
    rejected:     '❌',
    modification: '🔄',
    bill:         '🧾',
    info:         '💬',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '50%',
          width: '36px', height: '36px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.2s',
          fontSize: '1rem',
        }}
        title={t('notif.title')}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: '#EF4444',
            color: 'white',
            borderRadius: '50%',
            width: '18px', height: '18px',
            fontSize: '0.65rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 0 0 2px var(--sidebar-bg, #1E3A8A)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          width: '340px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '1px solid var(--gray-200)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--gray-100)',
            background: 'var(--surface-1)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              {t('notif.title')}
              {unread > 0 && (
                <span style={{ marginLeft: '8px', background: '#EF4444', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem' }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {t('notif.mark_all_read')}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔔</div>
                <div style={{ fontSize: '0.875rem' }}>{t('notif.no_notif')}</div>
              </div>
            ) : notifs.slice(0, 20).map(n => (
              <div
                key={n.id}
                onClick={() => handleRead(n.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--gray-100)',
                  background: n.read ? 'white' : '#EFF6FF',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }}>
                  {TYPE_ICONS[n.type] || '💬'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: n.read ? 500 : 700, color: 'var(--gray-800)', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '3px' }}>
                    {new Date(n.timestamp).toLocaleString('en-IN')}
                    {n.orderId && <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>#{n.orderId}</span>}
                  </div>
                </div>
                {!n.read && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: '4px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

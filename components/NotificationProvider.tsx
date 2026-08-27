'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSession, UserProfile } from '@/lib/auth';
import { getNotifications, NotificationItem, pushNotification, markNotificationRead, markAllRead, localizeNotificationMessage, displaySystemPushNotification } from '@/lib/notifications';
import { registerServiceWorker } from '@/lib/push';
import { getLangSync } from '@/lib/i18n';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  connected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const sessionRef = useRef<UserProfile | null>(null);

  // Clean up all connection variables
  const cleanup = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Register ServiceWorker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const handleNotification = useCallback((notif: NotificationItem) => {
    if (seenNotificationIdsRef.current.has(notif.id)) return;
    seenNotificationIdsRef.current.add(notif.id);

    const activeLang = getLangSync();
    const localized = localizeNotificationMessage(notif, activeLang);
    const resolvedNotif: NotificationItem = {
      ...notif,
      title: localized.title,
      message: localized.message
    };

    // Update notifications and unreadCount in state
    setNotifications((prev) => {
      if (prev.some((n) => n.id === resolvedNotif.id)) return prev;
      return [resolvedNotif, ...prev];
    });

    if (!resolvedNotif.read) {
      setUnreadCount((c) => c + 1);
    }

    // Trigger local push notification (toast + audio + browser push)
    pushNotification(resolvedNotif.message, resolvedNotif.recipient_role || undefined, resolvedNotif.order_id || undefined, {
      id: resolvedNotif.id,
      title: resolvedNotif.title,
      type: resolvedNotif.type,
      vendor_order_id: resolvedNotif.vendor_order_id,
      timestamp: resolvedNotif.timestamp,
    });

    // Play subtle audio alert
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  // Fallback Polling Mechanism if WebSocket is offline
  const stopFallbackPolling = useCallback(() => {
    if (fallbackPollingIntervalRef.current) {
      console.log('[WS CLIENT] Stopping fallback polling (WebSocket active).');
      clearInterval(fallbackPollingIntervalRef.current);
      fallbackPollingIntervalRef.current = null;
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackPollingIntervalRef.current) return;
    console.log('[WS CLIENT] Starting fallback polling...');

    // Fetch initial state immediately
    getNotifications().then((list) => {
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    });

    fallbackPollingIntervalRef.current = setInterval(async () => {
      try {
        const list = await getNotifications();
        // Update local list
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);

        // Notify dashboard pages to re-fetch orders and users too
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: { source: 'polling' } }));
          window.dispatchEvent(new CustomEvent('aharsetu_user_changed', { detail: { source: 'polling' } }));
        }

        // Fetch available vendors status
        const { getVendors } = await import('@/lib/vendors');
        const vendors = await getVendors();
        if (typeof window !== 'undefined' && vendors && vendors.length > 0) {
          let hasChange = false;
          vendors.forEach((v) => {
            const key = `aharsetu_vendor_status_${v.id}`;
            const currentStatus = localStorage.getItem(key);
            if (currentStatus !== v.status) {
              localStorage.setItem(key, v.status);
              hasChange = true;
            }
          });
          if (hasChange) {
            window.dispatchEvent(new CustomEvent('aharsetu_vendor_status_changed', { detail: { vendors } }));
          }
        }
      } catch (err) {
        console.warn('[WS CLIENT] Fallback polling sync error:', err);
      }
    }, 10000); // Poll every 10 seconds
  }, []);

  // Main connection builder
  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    const session = getSession();
    if (!session) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Reuse active socket if available and healthy
    if (socketRef.current && (socketRef.current.readyState === WebSocket.CONNECTING || socketRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const token = sessionStorage.getItem('aharsetu_access_token') || localStorage.getItem('aharsetu_access_token');
    if (!token) return;

    let wsUrl = '';
    if (process.env.NEXT_PUBLIC_WS_URL) {
      wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      const apiHost = process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const protocol = process.env.NEXT_PUBLIC_API_URL.startsWith('https') ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${apiHost}/api/v1/notifications/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : (window.location.port ? `${window.location.hostname}:8000` : window.location.host);
      wsUrl = `${protocol}//${host}/api/v1/notifications/ws`;
    }

    console.log('[WS CLIENT] Establishing secure WebSocket connection');
    cleanup();

    // Pass access token in subprotocol array to avoid plaintext URL leakage
    const socket = new WebSocket(wsUrl, ['token_' + token]);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WS CLIENT] WebSocket connected successfully.');
      setConnected(true);
      reconnectAttemptsRef.current = 0;
      stopFallbackPolling();

      // Send initial keep-alive ping
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('ping');
      }

      // Keepalive interval
      keepAliveIntervalRef.current = setInterval(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send('ping');
        }
      }, 10000);
    };

    socket.onmessage = async (event) => {
      if (event.data === 'pong') return;
      try {
        const payload = JSON.parse(event.data);
        console.log('[WS CLIENT] Message payload:', payload);

        if (payload.type === 'VENDOR_STATUS_UPDATED' || payload.type === 'VENDOR_UPDATED') {
          if (typeof window !== 'undefined') {
            if (payload.vendor_id && payload.status) {
              const key = `aharsetu_vendor_status_${payload.vendor_id}`;
              const currentStatus = localStorage.getItem(key);
              if (currentStatus !== payload.status) {
                localStorage.setItem(key, payload.status);
              }
            }
            try {
              const { getVendors } = await import('@/lib/vendors');
              getVendors().catch(() => {});
            } catch {}
            window.dispatchEvent(new CustomEvent('aharsetu_vendor_status_changed', { detail: payload }));
            window.dispatchEvent(new CustomEvent('aharsetu_vendor_updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('aharsetu_vendors_changed', { detail: payload }));
          }
        } else if (payload.type === 'USER_DELETED' || payload.type === 'USER_CREATED' || payload.type === 'USER_UPDATED') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aharsetu_user_changed', { detail: payload }));
          }
        } else if (payload.type === 'PROFILE_UPDATED') {
          if (typeof window !== 'undefined') {
            const { getSession: getFresh, setSession } = await import('@/lib/auth');
            const current = getFresh();
            if (current && current.id === payload.user_id) {
              const updated = {
                ...current,
                name: payload.name ?? current.name,
                mobile_number: payload.mobile_number ?? current.mobile_number,
                avatar_url: payload.avatar_url ?? current.avatar_url,
                avatar_version: payload.avatar_version ?? current.avatar_version,
                profile_setup_completed: payload.profile_setup_completed ?? current.profile_setup_completed,
                profile_setup_skipped: payload.profile_setup_skipped ?? current.profile_setup_skipped,
              };
              setSession(updated, true);
              window.dispatchEvent(new CustomEvent('aharsetu_profile_changed', { detail: updated }));
            }
            window.dispatchEvent(new CustomEvent('aharsetu_user_changed', { detail: payload }));
          }
        } else if (payload.type === 'MENU_UPDATED') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aharsetu_menu_updated', { detail: payload }));
          }
        } else if (payload.type === 'MENU_ITEM_AVAILABILITY_UPDATED') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aharsetu_menu_item_changed', { detail: payload }));
          }
        } else if (payload.type === 'ORDER_UPDATED') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: payload }));
          }
          // Fetch latest notifications to immediately surface any new approval/vendor alert
          getNotifications().then((freshList) => {
            setNotifications(freshList);
            setUnreadCount(freshList.filter((n) => !n.read).length);
            const latest = freshList[0];
            if (latest && !latest.read && !seenNotificationIdsRef.current.has(latest.id)) {
              handleNotification(latest);
            }
          }).catch(() => {});
        } else {
          handleNotification(payload);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: payload }));
          }
        }
      } catch (err) {
        console.error('[WS CLIENT] Parse payload error:', err);
      }
    };

    socket.onclose = (event) => {
      console.log(`[WS CLIENT] WebSocket disconnected: code=${event.code}`);
      setConnected(false);
      cleanup();
      startFallbackPolling();

      // Automatic connection retry with backoff
      if (getSession()) {
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[WS CLIENT] Retrying connection in ${backoff}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, backoff);
      }
    };

    socket.onerror = () => {
      console.warn('[WS CLIENT] WebSocket error occurred. Shutting down active connection.');
      socket.close();
    };
  }, [cleanup, startFallbackPolling, stopFallbackPolling, handleNotification]);

  const refresh = useCallback(async () => {
    try {
      const list = await getNotifications();
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {}
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      await refresh();
    } catch {}
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllRead();
      await refresh();
    } catch {}
  }, [refresh]);

  // Initial notification and connection sync
  useEffect(() => {
    const session = getSession();
    sessionRef.current = session;

    if (session) {
      refresh();
      connect();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setConnected(false);
      cleanup();
    }

    // Listen for custom auth logout and login dispatchers to immediately cycle WS state
    const handleAuthChange = () => {
      const fresh = getSession();
      if (fresh?.id !== sessionRef.current?.id) {
        sessionRef.current = fresh;
        if (fresh) {
          refresh();
          connect();
        } else {
          // Closed state cleanup
          if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
          }
          setNotifications([]);
          setUnreadCount(0);
          setConnected(false);
          cleanup();
        }
      }
    };

    // Cross-tab real-time sync: detect when another tab writes notifications to localStorage
    const handleStorageChange = (e: StorageEvent) => {
      // React to notification or order changes from other tabs
      if (e.key === 'aharsetu_notifications_v3.7' || e.key === 'aharsetu_orders_v3') {
        getNotifications().then((list) => {
          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.read).length);
        }).catch(() => {});
      }
    };

    window.addEventListener('aharsetu_profile_changed', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('aharsetu_profile_changed', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
      cleanup();
      if (fallbackPollingIntervalRef.current) {
        clearInterval(fallbackPollingIntervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect, cleanup, refresh]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, connected, markAsRead, markAllAsRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

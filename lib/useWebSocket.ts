'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSession } from './auth';
import { getNotifications, NotificationItem } from './notifications';

interface UseWebSocketOptions {
  onNotificationReceived?: (notification: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const keepAliveIntervalRef = useRef<any>(null);
  const fallbackPollingIntervalRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  // Store options in a ref to avoid reconnect loops when inline callbacks change
  const onNotificationReceivedRef = useRef(options.onNotificationReceived);
  useEffect(() => {
    onNotificationReceivedRef.current = options.onNotificationReceived;
  }, [options.onNotificationReceived]);

  // Clean up all resources
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

  const handleNotification = useCallback((notif: NotificationItem) => {
    if (seenNotificationIdsRef.current.has(notif.id)) return;
    seenNotificationIdsRef.current.add(notif.id);
    if (onNotificationReceivedRef.current) {
      onNotificationReceivedRef.current(notif);
    }
  }, []);

  // Poll notifications as a fallback
  const startFallbackPolling = useCallback(() => {
    if (fallbackPollingIntervalRef.current) return;
    console.log('[WS CLIENT] Starting fallback polling for notifications...');
    
    // Immediate initial poll
    getNotifications().then((list) => {
      list.forEach(handleNotification);
    });

    fallbackPollingIntervalRef.current = setInterval(async () => {
      try {
        const list = await getNotifications();
        list.forEach(handleNotification);
      } catch (err) {
        console.error('[WS CLIENT] Fallback polling error:', err);
      }
    }, 10000); // Poll every 10 seconds
  }, [handleNotification]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackPollingIntervalRef.current) {
      console.log('[WS CLIENT] Stopping fallback polling (WebSocket connected).');
      clearInterval(fallbackPollingIntervalRef.current);
      fallbackPollingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    const session = getSession();
    if (!session) return;

    const token = localStorage.getItem('aharsetu_access_token');
    if (!token) return;

    let wsUrl = '';
    if (process.env.NEXT_PUBLIC_WS_URL) {
      wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?token=${token}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
      wsUrl = `${protocol}//${host}/api/v1/notifications/ws?token=${token}`;
    }

    console.log(`[WS CLIENT] Connecting to notification socket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WS CLIENT] Notification socket connected.');
      setConnected(true);
      reconnectAttemptsRef.current = 0;
      stopFallbackPolling();

      // Start ping keepalives
      keepAliveIntervalRef.current = setInterval(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send('ping');
        }
      }, 10000);
    };

    socket.onmessage = (event) => {
      if (event.data === 'pong') return;
      try {
        const notif = JSON.parse(event.data);
        console.log('[WS CLIENT] Received notification payload:', notif);
        handleNotification(notif);
      } catch (err) {
        console.error('[WS CLIENT] Failed to parse WebSocket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log(`[WS CLIENT] Notification socket closed: code=${event.code}, reason=${event.reason || 'none'}`);
      setConnected(false);
      cleanup();
      startFallbackPolling();

      // Auto reconnect with exponential backoff (max 30s)
      if (getSession()) {
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[WS CLIENT] Reconnecting in ${backoff}ms (attempts=${reconnectAttemptsRef.current + 1})...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, backoff);
      }
    };

    socket.onerror = (event) => {
      // Use clean warning log to avoid triggering Next.js dev overlay popups
      console.warn('[WS CLIENT] WebSocket offline, activating fallback polling.');
      socket.close();
    };
  }, [cleanup, startFallbackPolling, stopFallbackPolling, handleNotification]);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
      if (fallbackPollingIntervalRef.current) {
        clearInterval(fallbackPollingIntervalRef.current);
        fallbackPollingIntervalRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect, cleanup]);

  return { connected };
}

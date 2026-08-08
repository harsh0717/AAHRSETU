'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSession } from './auth';

interface UseWebSocketOptions {
  onNotificationReceived?: (notification: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const keepAliveIntervalRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Check session first
    const session = getSession();
    if (!session) return;

    const token = localStorage.getItem('aharsetu_access_token');
    if (!token) return;

    // Build absolute WS url
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Dev server runs on port 8000
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/notifications/ws?token=${token}`;

    console.log(`Connecting to notification socket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Notification socket connected.');
      setConnected(true);
      reconnectAttemptsRef.current = 0;

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
        console.log('Received notification payload:', notif);
        if (options.onNotificationReceived) {
          options.onNotificationReceived(notif);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log(`Notification socket closed: code=${event.code}, reason=${event.reason}`);
      setConnected(false);
      cleanupConnection();

      // Auto reconnect with exponential backoff (max 30s)
      if (getSession()) {
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`Attempting reconnect in ${backoff}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, backoff);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      socket.close();
    };
  }, [options.onNotificationReceived]);

  const cleanupConnection = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    connect();
    return () => {
      cleanupConnection();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return { connected };
}

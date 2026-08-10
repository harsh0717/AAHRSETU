// ── Web Push Client Registration & Helper ────────────────────────────────────
import { getSession } from './auth';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] Service Worker registered cleanly:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[SW] Service Worker registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const session = getSession();
      if (session) {
        localStorage.setItem(`aharsetu_push_enabled_${session.id}`, 'true');
      }
      return true;
    }
  }
  return false;
}

export function isPushEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

// ── AharSetu Enterprise Notifications Service ───────────────────────────────
import { api } from './api';

export interface NotificationItem {
  id: string;
  recipient_id: number | null;
  recipient_role: string | null;
  message: string;
  type: string;
  order_id: string | null;
  vendor_order_id: string | null;
  read: boolean;
  timestamp: string;
}

const LOCAL_NOTIFS_KEY = 'aharsetu_notifications_v3';

const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    recipient_id: null,
    recipient_role: 'coordinator',
    message: 'Welcome to AharSetu v3.1 ERP. Requisition workflow is ready.',
    type: 'system',
    order_id: 'ORD-001',
    vendor_order_id: null,
    read: false,
    timestamp: new Date().toISOString()
  },
  {
    id: 'notif-2',
    recipient_id: null,
    recipient_role: 'vendor',
    message: 'New order ORD-003 assigned to Sharma Canteen for pricing confirmation.',
    type: 'order_status',
    order_id: 'ORD-003',
    vendor_order_id: 'VORD-003-1',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

function getLocalNotifs(): NotificationItem[] {
  if (typeof window === 'undefined') return FALLBACK_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(FALLBACK_NOTIFICATIONS));
      return FALLBACK_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return FALLBACK_NOTIFICATIONS;
  }
}

function saveLocalNotifs(items: NotificationItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(items));
}

export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    const res = await api.get<NotificationItem[]>('/notifications/');
    if (res && Array.isArray(res)) {
      saveLocalNotifs(res);
      return res;
    }
  } catch (err) {
    // Return local notification state silently
  }
  return getLocalNotifs();
}

export async function markNotificationRead(notifId: string): Promise<NotificationItem> {
  try {
    const res = await api.post<NotificationItem>(`/notifications/${notifId}/read`);
    if (res) return res;
  } catch (err) {
    console.warn('[NOTIFS] API mark read failed, updating locally');
  }
  const list = getLocalNotifs();
  const target = list.find(n => n.id === notifId);
  if (target) {
    target.read = true;
    saveLocalNotifs(list);
    return target;
  }
  throw new Error('Notification not found');
}

export async function markAllRead(): Promise<void> {
  try {
    await api.post<any>('/notifications/read-all');
  } catch (err) {
    console.warn('[NOTIFS] API mark all read failed, updating locally');
  }
  const list = getLocalNotifs();
  list.forEach(n => n.read = true);
  saveLocalNotifs(list);
}

// Compatibility stubs
export function notifyCoordinator(order: any, action: string, remarks?: string): void {}
export function notifyVendorsOnDCRApproval(order: any, users?: any[]): void {}
export function notifyCoordinatorModification(order: any, vendorName: string): void {}

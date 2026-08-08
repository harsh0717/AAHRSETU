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

export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    return await api.get<NotificationItem[]>('/notifications/');
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

export async function markNotificationRead(notifId: string): Promise<NotificationItem> {
  return await api.post<NotificationItem>(`/notifications/${notifId}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.post<any>('/notifications/read-all');
}

// Deprecated in v2: Notifications are triggered server-side.
// Kept as no-op stubs to prevent import resolution failures in legacy dashboard templates.
export function notifyCoordinator(order: any, action: string, remarks?: string): void {}
export function notifyVendorsOnDCRApproval(order: any, users?: any[]): void {}
export function notifyCoordinatorModification(order: any, vendorName: string): void {}

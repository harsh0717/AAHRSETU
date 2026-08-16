// ── AharSetu Targeted Enterprise Notifications Service ───────────────────────────────
import { api } from './api';
import { getSession } from './auth';

export type NotificationType =
  | 'ORDER_SUBMITTED_FOR_PRINCIPAL'
  | 'PRINCIPAL_APPROVED'
  | 'PRINCIPAL_REJECTED'
  | 'ORDER_SUBMITTED_FOR_DCR'
  | 'DCR_APPROVED'
  | 'DCR_REJECTED'
  | 'VENDOR_ORDER_ASSIGNED'
  | 'VENDOR_MODIFICATION_REQUESTED'
  | 'VENDOR_CONFIRMED'
  | 'BILL_GENERATED'
  | 'ORDER_COMPLETED'
  | 'SYSTEM_ALERT';

export interface NotificationItem {
  id: string;
  recipient_id: number | null;
  recipient_role: string | null;
  department_id: string | null;
  vendor_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  order_id: string | null;
  vendor_order_id: string | null;
  action_url: string | null;
  action_type?: string;
  action_label?: string;
  read: boolean;
  timestamp: string;
}

const LOCAL_NOTIFS_KEY = 'aharsetu_notifications_v3.7';

export function buildActionDetails(
  type: NotificationType,
  orderId?: string | null,
  vendorOrderId?: string | null,
  role?: string | null
): { action_url: string; action_type: string; action_label: string } {
  const r = role || 'coordinator';
  
  switch (type) {
    case 'ORDER_SUBMITTED_FOR_PRINCIPAL':
      return {
        action_url: `/principal/approvals`,
        action_type: 'OPEN_PRINCIPAL_APPROVAL',
        action_label: 'Review & Approve →'
      };
    case 'ORDER_SUBMITTED_FOR_DCR':
    case 'PRINCIPAL_APPROVED':
      return {
        action_url: `/dcr/approvals`,
        action_type: 'OPEN_DCR_APPROVAL',
        action_label: 'Review Audit →'
      };
    case 'VENDOR_ORDER_ASSIGNED':
      return {
        action_url: `/vendor/orders/incoming`,
        action_type: 'OPEN_VENDOR_ORDER',
        action_label: 'Process Order →'
      };
    case 'VENDOR_MODIFICATION_REQUESTED':
      return {
        action_url: r === 'vendor' ? `/vendor/modifications` : `/coordinator/orders`,
        action_type: 'OPEN_VENDOR_MODIFICATION',
        action_label: 'Review Request →'
      };
    case 'BILL_GENERATED':
      return {
        action_url: `/${r}/bills`,
        action_type: 'OPEN_BILL',
        action_label: 'View Bill →'
      };
    case 'PRINCIPAL_REJECTED':
    case 'DCR_REJECTED':
      return {
        action_url: orderId ? `/order/${orderId}` : `/coordinator/orders`,
        action_type: 'OPEN_COORDINATOR_ORDER',
        action_label: 'View Rejection →'
      };
    case 'ORDER_COMPLETED':
    case 'VENDOR_CONFIRMED':
    case 'DCR_APPROVED':
    default:
      return {
        action_url: orderId ? `/order/${orderId}` : `/${r}`,
        action_type: 'OPEN_ORDER',
        action_label: 'View Order →'
      };
  }
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-init-1',
    recipient_id: 8,
    recipient_role: 'coordinator',
    department_id: 'diploma',
    vendor_id: null,
    type: 'SYSTEM_ALERT',
    title: 'System Ready',
    message: 'Welcome to AharSetu v3.7. Actionable deep-linking is active.',
    order_id: 'ORD-001',
    vendor_order_id: null,
    action_url: '/coordinator/orders',
    action_type: 'OPEN_ORDER',
    action_label: 'View Orders →',
    read: false,
    timestamp: new Date().toISOString()
  },
  {
    id: 'notif-init-2',
    recipient_id: 14,
    recipient_role: 'vendor',
    department_id: null,
    vendor_id: 'v1',
    type: 'VENDOR_ORDER_ASSIGNED',
    title: 'New Canteen Order',
    message: 'Requisition ORD-003 assigned to Sharma Canteen for order processing.',
    order_id: 'ORD-003',
    vendor_order_id: 'VORD-003-1',
    action_url: '/vendor/orders/incoming',
    action_type: 'OPEN_VENDOR_ORDER',
    action_label: 'Process Order →',
    read: false,
    timestamp: new Date(Date.now() - 1800000).toISOString()
  }
];

function getLocalNotifs(): NotificationItem[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

function saveLocalNotifs(items: NotificationItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(items));
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const session = getSession();
  let list: NotificationItem[] = [];

  try {
    const res = await api.get<NotificationItem[]>('/notifications');
    if (res && Array.isArray(res)) {
      saveLocalNotifs(res);
      list = res;
    } else {
      list = getLocalNotifs();
    }
  } catch {
    list = getLocalNotifs();
  }

  if (!session) return list;

  // Strict Recipient Targeting Filter
  return list.filter(n => {
    if (n.recipient_id !== null && n.recipient_id === session.id) return true;
    if (session.role === 'admin') return true;

    if (session.role === 'principal') {
      if (n.recipient_role === 'principal') {
        return !session.department_id || !n.department_id || n.department_id === session.department_id;
      }
      return false;
    }

    if (session.role === 'coordinator') {
      if (n.recipient_role === 'coordinator') {
        return n.recipient_id === session.id || (!n.recipient_id && n.department_id === session.department_id);
      }
      return false;
    }

    if (session.role === 'vendor') {
      if (n.recipient_role === 'vendor') {
        return !n.vendor_id || n.vendor_id === session.vendor_id;
      }
      return false;
    }

    if (session.role === 'dcr') {
      return n.recipient_role === 'dcr' || n.type === 'ORDER_SUBMITTED_FOR_DCR';
    }

    return false;
  });
}

export async function markNotificationRead(notifId: string): Promise<NotificationItem> {
  try {
    await api.post(`/notifications/${notifId}/read`).catch(() => {});
  } catch {}
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
    await api.post('/notifications/read-all').catch(() => {});
  } catch {}
  const list = getLocalNotifs();
  list.forEach(n => n.read = true);
  saveLocalNotifs(list);
}

export function pushNotification(
  message: string,
  recipient_role?: string,
  order_id?: string,
  options?: Partial<NotificationItem>
) {
  const session = getSession();
  const notifType: NotificationType = options?.type || 'SYSTEM_ALERT';
  const actionDetails = buildActionDetails(notifType, order_id, options?.vendor_order_id, recipient_role || session?.role);

  const notif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipient_id: options?.recipient_id ?? null,
    recipient_role: recipient_role || null,
    department_id: options?.department_id || session?.department_id || 'diploma',
    vendor_id: options?.vendor_id || session?.vendor_id || null,
    type: notifType,
    title: options?.title || 'AharSetu Workflow Alert',
    message,
    order_id: order_id || null,
    vendor_order_id: options?.vendor_order_id || null,
    action_url: options?.action_url || actionDetails.action_url,
    action_type: options?.action_type || actionDetails.action_type,
    action_label: options?.action_label || actionDetails.action_label,
    read: false,
    timestamp: new Date().toISOString()
  };

  const list = getLocalNotifs();
  list.unshift(notif);
  saveLocalNotifs(list);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aharsetu_toast', { detail: { message, notif } }));
    
    // Web Push Service Worker Trigger
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PUSH_NOTIFICATION',
        title: notif.title,
        body: message,
        url: notif.action_url || '/'
      });
    }
  }
}

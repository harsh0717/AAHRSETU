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
  | 'VENDOR_REJECTED'
  | 'BILL_GENERATED'
  | 'ORDER_COMPLETED'
  | 'ORDER_UPDATED'
  | 'ORDER_CANCELLED'
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
  route?: string | null;
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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

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
  const current = localStorage.getItem(LOCAL_NOTIFS_KEY);
  const sorted = [...items].sort((a, b) => (a.id && b.id) ? a.id.localeCompare(b.id) : 0);
  const next = JSON.stringify(sorted);
  if (current === next) return;
  localStorage.setItem(LOCAL_NOTIFS_KEY, next);
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

export function displaySystemPushNotification(title: string, body: string, url: string = '/') {
  if (typeof window === 'undefined') return;

  // 1. If ServiceWorker registration is available, try showNotification
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg && reg.showNotification && 'Notification' in window && Notification.permission === 'granted') {
        reg.showNotification(title || 'AharSetu Alert', {
          body: body || 'New workflow notification',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: { url: url || '/' },
        });
      }
    }).catch(() => {});
  }

  // 2. Fallback to native window.Notification constructor
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title || 'AharSetu Alert', {
        body: body || 'New workflow notification',
        icon: '/favicon.ico',
        data: { url: url || '/' }
      });
      n.onclick = () => {
        window.focus();
        if (url && url !== '/') {
          window.location.href = url;
        }
      };
    } catch {
      // Mobile Safari / Chrome fallback handled by SW
    }
  }
}

export function localizeNotificationMessage(notif: NotificationItem, targetLang: string = 'en'): { title: string; message: string } {
  const lang = ['en', 'hi', 'gu'].includes(targetLang) ? targetLang : 'en';
  let title = notif.title || 'AharSetu Alert';
  let message = notif.message || '';

  // Extract order ID or quoted title if available
  const quotedMatch = message.match(/"([^"]+)"/);
  const orderTitle = quotedMatch ? quotedMatch[1] : (notif.order_id || 'Requisition');
  const dept = notif.department_id ? (notif.department_id.charAt(0).toUpperCase() + notif.department_id.slice(1)) : 'Campus';

  // If the target language is English but the message was saved in Hindi or Gujarati
  if (lang === 'en') {
    if (message.includes('अनुमोदन के लिए') || message.includes('સબમિટ કરવામાં આવ્યો') || notif.type === 'ORDER_SUBMITTED_FOR_PRINCIPAL') {
      title = 'Approval Requisition';
      message = `Master order "${orderTitle}" has been submitted for Principal approval.`;
    } else if (message.includes('स्वीकृत हो गया') || message.includes('મંજૂર થઈ ગયો') || notif.type === 'PRINCIPAL_APPROVED') {
      title = 'Principal Approved';
      message = `Your order "${orderTitle}" has been approved by Principal.`;
    } else if (message.includes('अस्वीकृत') || message.includes('નામંજૂર') || notif.type === 'PRINCIPAL_REJECTED') {
      title = 'Principal Rejected';
      message = `Your order "${orderTitle}" was rejected by Principal.`;
    } else if (message.includes('DCR ने') || message.includes('DCR એ') || notif.type === 'DCR_APPROVED') {
      title = 'DCR Audit Approved';
      message = `DCR has approved your order "${orderTitle}" and forwarded to canteen.`;
    } else if (message.includes('DCR ने खारिज') || message.includes('DCR એ નકારી') || notif.type === 'DCR_REJECTED') {
      title = 'DCR Rejected';
      message = `DCR has rejected your order "${orderTitle}".`;
    } else if (message.includes('संशोधन का अनुरोध') || message.includes('સુધારા વિનંતી') || notif.type === 'VENDOR_MODIFICATION_REQUESTED') {
      title = 'Item Modification Requested';
      message = `Canteen vendor requested modification for order "${orderTitle}".`;
    } else if (message.includes('पुष्टि कर दी') || message.includes('પુષ્ટિ કરી') || notif.type === 'VENDOR_CONFIRMED') {
      title = 'Canteen Pricing Confirmed';
      message = `Canteen vendor confirmed pricing for order "${orderTitle}".`;
    } else if (message.includes('चालान बनाया गया') || message.includes('બિલ બન્યું') || notif.type === 'BILL_GENERATED') {
      title = 'Invoice Generated';
      message = `Invoice generated for order "${orderTitle}".`;
    } else if (message.includes('पूर्ण चिह्नित') || message.includes('પૂર્ણ તરીકે') || notif.type === 'ORDER_COMPLETED') {
      title = 'Order Completed';
      message = `Your order "${orderTitle}" has been marked as completed.`;
    } else if (message.includes('नया ऑर्डर') || message.includes('નવો ઑર્ડર') || notif.type === 'ORDER_SUBMITTED_FOR_DCR') {
      title = 'New Order Requisition';
      message = `New order received from ${dept} Department: "${orderTitle}"`;
    }
  } else if (lang === 'hi') {
    if (notif.type === 'ORDER_SUBMITTED_FOR_PRINCIPAL' || message.includes('submitted for approval')) {
      title = 'अनुमोदन अनुरोध';
      message = `मास्टर ऑर्डर "${orderTitle}" अनुमोदन के लिए प्रस्तुत किया गया है।`;
    } else if (notif.type === 'PRINCIPAL_APPROVED' || message.includes('approved by Principal')) {
      title = 'प्राचार्य द्वारा स्वीकृत';
      message = `आपका ऑर्डर "${orderTitle}" प्राचार्य द्वारा स्वीकृत हो गया है।`;
    } else if (notif.type === 'DCR_APPROVED' || message.includes('DCR has approved')) {
      title = 'DCR ऑडिट स्वीकृत';
      message = `DCR ने आपके ऑर्डर "${orderTitle}" को मंजूरी दे दी है।`;
    } else if (notif.type === 'VENDOR_CONFIRMED' || message.includes('confirmed pricing')) {
      title = 'मूल्य पुष्टि';
      message = `कैंटीन ने ऑर्डर "${orderTitle}" के लिए मूल्य की पुष्टि कर दी है।`;
    } else if (notif.type === 'ORDER_COMPLETED' || message.includes('marked as completed')) {
      title = 'ऑर्डर पूर्ण';
      message = `आपका ऑर्डर "${orderTitle}" पूर्ण चिह्नित किया गया है।`;
    }
  } else if (lang === 'gu') {
    if (notif.type === 'ORDER_SUBMITTED_FOR_PRINCIPAL' || message.includes('submitted for approval')) {
      title = 'મંજૂરી વિનંતી';
      message = `માસ્ટર ઑર્ડર "${orderTitle}" મંજૂરી માટે સબમિટ કરવામાં આવ્યો છે.`;
    } else if (notif.type === 'PRINCIPAL_APPROVED' || message.includes('approved by Principal')) {
      title = 'આચાર્ય મંજૂર';
      message = `તમારો ઑર્ડર "${orderTitle}" આચાર્ય દ્વારા મંજૂર થઈ ગયો છે.`;
    } else if (notif.type === 'DCR_APPROVED' || message.includes('DCR has approved')) {
      title = 'DCR ઓડિટ મંજૂર';
      message = `DCR એ તમારા ઑર્ડર "${orderTitle}" ને મંજૂરી આપી દીધી છે.`;
    } else if (notif.type === 'VENDOR_CONFIRMED' || message.includes('confirmed pricing')) {
      title = 'કિંમત પુષ્ટિ';
      message = `કેન્ટીન એ ઑર્ડર "${orderTitle}" માટે કિંમતની પુષ્ટિ કરી છે.`;
    } else if (notif.type === 'ORDER_COMPLETED' || message.includes('marked as completed')) {
      title = 'ઑર્ડર પૂર્ણ';
      message = `તમારો ઑર્ડર "${orderTitle}" પૂર્ણ તરીકે ચિહ્નિત થયો છે.`;
    }
  }

  return { title, message };
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
    // 1. Dispatch custom event for in-app toast banner
    window.dispatchEvent(new CustomEvent('aharsetu_toast', {
      detail: {
        title: notif.title,
        message,
        role: notif.recipient_role || session?.role || 'system',
        order_id: notif.order_id,
        type: notif.type,
        notif
      }
    }));
    
    // 2. Trigger native/ServiceWorker system push notification
    displaySystemPushNotification(notif.title, message, notif.action_url || '/');

    // 3. Web Push Service Worker message trigger
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

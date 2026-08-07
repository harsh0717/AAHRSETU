// ── AharSetu Notifications Library ───────────────────────────────────────────

const NOTIF_KEY = 'aharsetu_notifications';

export function getNotifications() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveNotifications(notifs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function getNotificationsForUser(userId, role) {
  return getNotifications()
    .filter(n => n.recipientId === userId || n.recipientRole === role)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function getUnreadCount(userId, role) {
  return getNotificationsForUser(userId, role).filter(n => !n.read).length;
}

export function createNotification({ recipientId, recipientRole, message, type = 'info', orderId, vendorOrderId }) {
  const notif = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    recipientId: recipientId || null,
    recipientRole: recipientRole || null,
    message,
    type,
    orderId: orderId || null,
    vendorOrderId: vendorOrderId || null,
    read: false,
    timestamp: new Date().toISOString(),
  };
  const notifs = getNotifications();
  notifs.unshift(notif);
  // Keep only last 200 notifications
  saveNotifications(notifs.slice(0, 200));
  return notif;
}

export function markNotificationRead(notifId) {
  const notifs = getNotifications().map(n =>
    n.id === notifId ? { ...n, read: true } : n
  );
  saveNotifications(notifs);
}

export function markAllRead(userId, role) {
  const notifs = getNotifications().map(n =>
    (n.recipientId === userId || n.recipientRole === role)
      ? { ...n, read: true }
      : n
  );
  saveNotifications(notifs);
}

export function deleteNotification(notifId) {
  saveNotifications(getNotifications().filter(n => n.id !== notifId));
}

/**
 * Notify all vendors involved in an order when DCR approves
 */
export function notifyVendorsOnDCRApproval(masterOrder, users) {
  const notified = [];
  (masterOrder.vendorOrders || []).forEach(vo => {
    // Find the user account for this vendor
    const vendorUser = users.find(u => u.vendorId === vo.vendorId);
    const dept = masterOrder.departmentLabel || masterOrder.department || 'Unknown';
    if (vendorUser) {
      createNotification({
        recipientId: vendorUser.id,
        recipientRole: 'vendor',
        message: `New order received from ${dept} Department: "${masterOrder.title}"`,
        type: 'new_order',
        orderId: masterOrder.id,
        vendorOrderId: vo.id,
      });
      notified.push(vendorUser.id);
    }
  });
  return notified;
}

/**
 * Notify coordinator when their order is approved/rejected
 */
export function notifyCoordinator(masterOrder, action, remarks = '') {
  createNotification({
    recipientId: masterOrder.createdBy?.id,
    recipientRole: 'coordinator',
    message: `Your order "${masterOrder.title}" has been ${action}.${remarks ? ' Note: ' + remarks : ''}`,
    type: action.includes('rejected') ? 'rejected' : 'approved',
    orderId: masterOrder.id,
  });
}

/**
 * Notify coordinator about vendor modification request
 */
export function notifyCoordinatorModification(masterOrder, vendorName) {
  createNotification({
    recipientId: masterOrder.createdBy?.id,
    recipientRole: 'coordinator',
    message: `${vendorName} has requested a modification for order "${masterOrder.title}".`,
    type: 'modification',
    orderId: masterOrder.id,
  });
}

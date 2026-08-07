// ── AharSetu v2.0 localStorage Store ─────────────────────────────────────────
import { SEED_USERS } from './seedUsers';
import { SEED_VENDORS } from './seedUsers';
import { SEED_ORDERS } from './seedData';

const ORDERS_KEY   = 'aharsetu_orders';
const USERS_KEY    = 'aharsetu_users';
const VENDORS_KEY  = 'aharsetu_vendors';
const SESSION_KEY  = 'aharsetu_session';
const NOTIF_KEY    = 'aharsetu_notifications';
const SEEDED_KEY   = 'aharsetu_seeded_v2'; // v2 key forces re-seed

// ── Orders (MasterOrder) ──────────────────────────────────────────────────────

export function getOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveOrders(orders) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function getOrderById(id) {
  return getOrders().find(o => o.id === id) || null;
}

export function upsertOrder(order) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  const updated = { ...order, updatedAt: new Date().toISOString() };
  if (idx >= 0) orders[idx] = updated;
  else orders.unshift(updated);
  saveOrders(orders);
  return updated;
}

/**
 * Create a MasterOrder from coordinator's item selection.
 * Automatically splits items into VendorOrders grouped by vendorId.
 */
export function createMasterOrder({ title, purpose, department, departmentLabel, items, createdBy }) {
  const now = new Date().toISOString();
  const orderId = 'ORD-' + String(Date.now()).slice(-6);

  // Group items by vendorId
  const byVendor = {};
  items.forEach(item => {
    if (!item.vendorId) return;
    if (!byVendor[item.vendorId]) {
      byVendor[item.vendorId] = {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        items: [],
      };
    }
    byVendor[item.vendorId].items.push({
      name: item.name,
      quantity: item.quantity,
      price: 0,
      vendorId: item.vendorId,
      vendorName: item.vendorName,
      menuItemId: item.id,
    });
  });

  const vendorOrders = Object.values(byVendor).map((vo, i) => ({
    id: `VORD-${String(Date.now()).slice(-6)}-${i + 1}`,
    masterOrderId: orderId,
    vendorId: vo.vendorId,
    vendorName: vo.vendorName,
    items: vo.items,
    status: 'Pending',
    billAmount: 0,
    invoiceNumber: null,
    modification: null,
  }));

  const order = {
    id: orderId,
    title,
    purpose,
    department,
    departmentLabel,
    createdBy,
    status: 'Created',
    vendorOrders,
    principalApproval: { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    dcrApproval:       { status: null, remarks: '', reviewedAt: '', reviewedBy: '' },
    totalBillAmount: 0,
    billGeneratedAt: '',
    history: [{
      action: 'Order Created',
      role: createdBy.role,
      user: createdBy.name,
      timestamp: now,
      remarks: `${items.length} items from ${vendorOrders.length} vendor(s)`,
    }],
    createdAt: now,
    updatedAt: now,
  };

  upsertOrder(order);
  return order;
}

// Legacy createOrder kept for compatibility
export function createOrder({ title, purpose, items, createdBy }) {
  return createMasterOrder({
    title,
    purpose,
    department: createdBy?.department || 'unknown',
    departmentLabel: createdBy?.departmentLabel || createdBy?.department || 'Unknown',
    items,
    createdBy,
  });
}

export function addHistoryEntry(orderId, entry) {
  const order = getOrderById(orderId);
  if (!order) return null;
  const updated = {
    ...order,
    history: [...(order.history || []), { ...entry, timestamp: new Date().toISOString() }],
  };
  return upsertOrder(updated);
}

export function updateOrderStatus(orderId, status, extra = {}) {
  const order = getOrderById(orderId);
  if (!order) return null;
  return upsertOrder({ ...order, status, ...extra });
}

export function updateVendorOrderInMaster(masterOrderId, updatedVendorOrder) {
  const order = getOrderById(masterOrderId);
  if (!order) return null;
  const vendorOrders = (order.vendorOrders || []).map(vo =>
    vo.id === updatedVendorOrder.id ? updatedVendorOrder : vo
  );
  return upsertOrder({ ...order, vendorOrders });
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

// ── Seed ──────────────────────────────────────────────────────────────────────

export function initSeedData() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEEDED_KEY)) return;

  // Clear any v1 data
  localStorage.removeItem('aharsetu_seeded');
  localStorage.removeItem('aharsetu_menu');

  // Seed all collections
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(VENDORS_KEY)) {
    localStorage.setItem(VENDORS_KEY, JSON.stringify(SEED_VENDORS));
  }
  if (!localStorage.getItem(ORDERS_KEY)) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(SEED_ORDERS));
  }
  if (!localStorage.getItem(NOTIF_KEY)) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify([]));
  }

  localStorage.setItem(SEEDED_KEY, '1');
}

export function resetAllData() {
  if (typeof window === 'undefined') return;
  [ORDERS_KEY, USERS_KEY, VENDORS_KEY, SESSION_KEY, NOTIF_KEY, SEEDED_KEY,
   'aharsetu_seeded', 'aharsetu_menu', 'aharsetu_lang',
  ].forEach(k => localStorage.removeItem(k));
}

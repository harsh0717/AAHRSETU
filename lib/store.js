// ── AharSetu localStorage Store ───────────────────────────────────────────────
import { DEFAULT_MENU_ITEMS } from './constants';
import { SEED_ORDERS } from './seedData';

const ORDERS_KEY   = 'aharsetu_orders';
const MENU_KEY     = 'aharsetu_menu';
const SESSION_KEY  = 'aharsetu_session';
const SEEDED_KEY   = 'aharsetu_seeded';

// ── Orders ────────────────────────────────────────────────────────────────────

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
  if (idx >= 0) {
    orders[idx] = { ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.unshift({ ...order, updatedAt: new Date().toISOString() });
  }
  saveOrders(orders);
  return order;
}

export function createOrder({ title, purpose, items, createdBy }) {
  const id = 'ORD-' + String(Date.now()).slice(-6);
  const now = new Date().toISOString();
  const order = {
    id,
    title,
    purpose,
    items: items.map(i => ({ ...i, price: 0 })),
    createdBy,
    status: 'Created',
    createdAt: now,
    updatedAt: now,
    principalApproval: { status: null, remarks: '', reviewedAt: '' },
    dcrApproval:       { status: null, remarks: '', reviewedAt: '' },
    billAmount: 0,
    billGeneratedAt: '',
    notified: { coordinator: false, principal: false, dcr: false },
    history: [{
      action: 'Order Created',
      role: createdBy.role,
      user: createdBy.name,
      timestamp: now,
      remarks: '',
    }],
  };
  upsertOrder(order);
  return order;
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

// ── Menu ──────────────────────────────────────────────────────────────────────

export function getMenu() {
  if (typeof window === 'undefined') return DEFAULT_MENU_ITEMS;
  try {
    const raw = localStorage.getItem(MENU_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_MENU_ITEMS;
  } catch { return DEFAULT_MENU_ITEMS; }
}

export function saveMenu(items) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MENU_KEY, JSON.stringify(items));
}

export function upsertMenuItem(item) {
  const menu = getMenu();
  const idx = menu.findIndex(m => m.id === item.id);
  if (idx >= 0) menu[idx] = item;
  else menu.push(item);
  saveMenu(menu);
}

export function deleteMenuItem(id) {
  const menu = getMenu().filter(m => m.id !== id);
  saveMenu(menu);
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

// ── Seed Data ─────────────────────────────────────────────────────────────────

export function initSeedData() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEEDED_KEY)) return; // already seeded
  saveOrders(SEED_ORDERS);
  localStorage.setItem(SEEDED_KEY, '1');
}

export function resetAllData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORDERS_KEY);
  localStorage.removeItem(MENU_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SEEDED_KEY);
}

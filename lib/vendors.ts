// ── AharSetu Enterprise Vendor & Menu Service ───────────────────────────────
import { api } from './api';
import { getSession } from './auth';

export interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  unit: string;
  description?: string | null;
  category?: string;
  available: boolean;
  active: boolean;
  image_url?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  status: string; // open, closed, temporarily_unavailable
  revenue: number;
  menu_items?: MenuItem[];
  image_url?: string | null;
  active?: boolean;
}

const LOCAL_VENDORS_KEY = 'aharsetu_vendors_v3';
const LOCAL_MENUS_KEY = 'aharsetu_menus_v3';

const FALLBACK_VENDORS: Vendor[] = [
  { id: 'v1', name: 'Sharma Canteen', owner_name: 'M. Khan', email: 'vendor1@aharsetu.edu.in', phone: '+91 9911223344', status: 'open', revenue: 150.0 },
  { id: 'v2', name: 'Fresh Bites', owner_name: 'R. Patel', email: 'vendor2@aharsetu.edu.in', phone: '+91 9922334455', status: 'open', revenue: 450.0 },
  { id: 'v3', name: 'Hot Meals', owner_name: 'S. Shah', email: 'vendor3@aharsetu.edu.in', phone: '+91 9933445566', status: 'closed', revenue: 0.0 },
  { id: 'v4', name: 'Quick Snacks', owner_name: 'P. Mehta', email: 'vendor4@aharsetu.edu.in', phone: '+91 9944556677', status: 'temporarily_unavailable', revenue: 0.0 },
];

const FALLBACK_MENUS: Record<string, MenuItem[]> = {
  v1: [
    { id: 'v1m1', vendor_id: 'v1', name: 'Tea', price: 10.0, unit: 'per cup', available: true, active: true, category: 'Beverages', description: 'Freshly brewed masala tea with local spices' },
    { id: 'v1m2', vendor_id: 'v1', name: 'Samosa', price: 15.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Crispy triangular pastry stuffed with spiced potatoes' },
    { id: 'v1m3', vendor_id: 'v1', name: 'Kachori', price: 18.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Flaky deep-fried snack with lentils and local spices' },
    { id: 'v1m4', vendor_id: 'v1', name: 'Coffee', price: 15.0, unit: 'per cup', available: true, active: true, category: 'Beverages', description: 'Hot filter coffee prepared with fresh milk' },
  ],
  v2: [
    { id: 'v2m1', vendor_id: 'v2', name: 'Veg Lunch', price: 80.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Standard north Indian meal with roti, sabzi, dal and rice' },
    { id: 'v2m2', vendor_id: 'v2', name: 'Idli Sambhar', price: 40.0, unit: 'per plate', available: true, active: true, category: 'Breakfast', description: 'Soft steamed rice cakes served with sambhar and coconut chutney' },
    { id: 'v2m3', vendor_id: 'v2', name: 'Fruit Bowl', price: 50.0, unit: 'per bowl', available: true, active: true, category: 'Snacks', description: 'Fresh seasonal cut fruits' },
  ],
  v3: [
    { id: 'v3m1', vendor_id: 'v3', name: 'Thali', price: 100.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Premium authentic thali with ghee roti, two sabzis, dal, rice, sweet and papad' }
  ],
  v4: [
    { id: 'v4m1', vendor_id: 'v4', name: 'Sandwich', price: 35.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Grilled vegetable sandwich with mint chutney' }
  ]
};

export function getMenuItemName(menuItemId: string | null | undefined): string {
  if (!menuItemId) return 'Canteen Special Item';
  const cleanId = menuItemId.replace('Item #', '').trim();

  for (const list of Object.values(FALLBACK_MENUS)) {
    const item = list.find(m => m.id === cleanId || m.id === menuItemId);
    if (item) return item.name;
  }

  if (cleanId.includes('v1m1')) return 'Masala Tea';
  if (cleanId.includes('v1m2')) return 'Samosa';
  if (cleanId.includes('v1m3')) return 'Kachori';
  if (cleanId.includes('v1m4')) return 'Coffee';
  if (cleanId.includes('v1m5')) return 'Cold Drink / Juice';
  if (cleanId.includes('v2m1')) return 'Veg Lunch';
  if (cleanId.includes('v2m2')) return 'Idli Sambhar';
  if (cleanId.includes('v2m3')) return 'Fruit Bowl';
  if (cleanId.includes('v3m1')) return 'Special Thali';
  if (cleanId.includes('v4m1')) return 'Grilled Sandwich';

  if (/^[a-z][0-9][a-z][0-9]+/i.test(cleanId) || /^v\d+m\d+/i.test(cleanId)) {
    return 'Special Canteen Refreshment';
  }

  return cleanId;
}

function getLocalVendors(): Vendor[] {
  if (typeof window === 'undefined') return FALLBACK_VENDORS;
  try {
    const raw = localStorage.getItem(LOCAL_VENDORS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_VENDORS_KEY, JSON.stringify(FALLBACK_VENDORS));
      return FALLBACK_VENDORS;
    }
    return JSON.parse(raw);
  } catch {
    return FALLBACK_VENDORS;
  }
}

function saveLocalVendors(vendors: Vendor[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_VENDORS_KEY, JSON.stringify(vendors));
}

function getLocalMenu(vendorId: string): MenuItem[] {
  if (typeof window === 'undefined') return FALLBACK_MENUS[vendorId] || [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MENUS_KEY}_${vendorId}`);
    if (!raw) {
      const fallback = FALLBACK_MENUS[vendorId] || [];
      localStorage.setItem(`${LOCAL_MENUS_KEY}_${vendorId}`, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return FALLBACK_MENUS[vendorId] || [];
  }
}

// ── CUSTOM FOOD PHOTO STORAGE UTILITY ──────────────────────────────────────────
const CUSTOM_FOOD_IMAGES_KEY = 'aharsetu_custom_food_images_v1';

export function saveCustomFoodImage(itemId: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CUSTOM_FOOD_IMAGES_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[itemId] = dataUrl;
    localStorage.setItem(CUSTOM_FOOD_IMAGES_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Error saving custom food image:', err);
  }
}

export function getCustomFoodImage(itemId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_FOOD_IMAGES_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    return store[itemId] || null;
  } catch {
    return null;
  }
}

function saveLocalMenu(vendorId: string, items: MenuItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${LOCAL_MENUS_KEY}_${vendorId}`, JSON.stringify(items));
}

export async function getVendors(): Promise<Vendor[]> {
  try {
    const apiVendors = await api.get<Vendor[]>('/vendors');
    if (apiVendors && Array.isArray(apiVendors) && apiVendors.length > 0) {
      // Backend is source of truth — do NOT apply any localStorage overrides
      return apiVendors;
    }
  } catch (err) {
    console.warn('[VENDORS] API fetch failed, using local fallback:', err);
  }
  // True offline fallback — use FALLBACK_VENDORS (hardcoded seed data)
  return FALLBACK_VENDORS;
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const vendors = await getVendors();
  return vendors.find((v) => v.id === id) || null;
}

export async function getOpenVendors(): Promise<Vendor[]> {
  const vendors = await getVendors();
  return vendors.filter((v) => v.status === 'open');
}

export async function getAvailableVendors(): Promise<Vendor[]> {
  const vendors = await getVendors();
  const openVendors = vendors.filter((v) => v.status === 'open');
  const result: Vendor[] = [];

  for (const v of openVendors) {
    const menu = await getVendorMenu(v.id);
    const hasAvailableItems = menu.some((m) => m.available && m.active);
    if (hasAvailableItems) {
      result.push({ ...v, menu_items: menu.filter((m) => m.available && m.active) });
    }
  }
  return result;
}

export async function updateVendorStatus(vendorId: string, status: string): Promise<Vendor> {
  try {
    const session = getSession();
    let res;
    if (session?.role === 'vendor') {
      res = await api.request<Vendor>('/vendors/me/availability', {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } else {
      res = await api.put<Vendor>(`/vendors/${vendorId}/status`, { status });
    }

    if (res) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aharsetu_vendor_status_changed', { detail: { vendorId, status, vendor: res } }));
      }
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    // Provide clear error for authentication failures
    if (err?.status === 401) {
      throw new Error('Session expired. Please log in again to update vendor status.');
    }
    if (err?.status === 403) {
      throw new Error('You do not have permission to update this vendor\'s status.');
    }
    throw err;
  }
}

export async function getVendorMenu(vendorId: string): Promise<MenuItem[]> {
  // Always prefer API — backend is source of truth for menu state
  try {
    const res = await api.get<MenuItem[]>(`/vendors/${vendorId}/menu`);
    if (res && Array.isArray(res)) {
      return res;
    }
  } catch (err) {
    console.warn(`[VENDORS] API menu fetch for ${vendorId} failed, serving local fallback`);
  }
  return FALLBACK_MENUS[vendorId] || [];
}

export async function upsertVendorMenuItem(vendorId: string, item: any): Promise<MenuItem> {
  const payload = {
    id: item.id || null,
    name: item.name,
    price: parseFloat(item.price),
    unit: item.unit || 'per plate',
    description: item.description || null,
    category: item.category || 'General',
    available: item.available !== false,
    active: item.active !== false,
    image_url: item.image_url || null,
  };

  try {
    const res = await api.post<MenuItem>(`/vendors/${vendorId}/menu`, payload);
    if (res) return res;
  } catch (err) {
    console.warn('[VENDORS] API menu update failed, saving locally');
  }

  const menu = getLocalMenu(vendorId);
  const newItem: MenuItem = {
    id: payload.id || `m-${Date.now()}`,
    vendor_id: vendorId,
    name: payload.name,
    price: payload.price,
    unit: payload.unit,
    description: payload.description,
    category: payload.category,
    available: payload.available,
    active: payload.active,
    image_url: payload.image_url,
  };

  const idx = menu.findIndex(m => m.id === newItem.id);
  if (idx >= 0) menu[idx] = newItem;
  else menu.push(newItem);

  saveLocalMenu(vendorId, menu);
  return newItem;
}

export async function deleteVendorMenuItem(vendorId: string, itemId: string): Promise<void> {
  try {
    await api.delete(`/vendors/${vendorId}/menu/${itemId}`);
  } catch (err) {
    console.warn('[VENDORS] API menu delete failed, deleting locally');
  }

  const menu = getLocalMenu(vendorId).filter(m => m.id !== itemId);
  saveLocalMenu(vendorId, menu);
}

export async function deleteVendor(vendorId: string): Promise<void> {
  try {
    await api.delete(`/vendors/${vendorId}`);
  } catch (err) {
    console.warn('[VENDORS] API delete vendor failed, deleting locally');
  }

  const vendors = getLocalVendors().filter(v => v.id !== vendorId);
  saveLocalVendors(vendors);
}

export async function getAvailableMenuByVendor(): Promise<{ id: string; name: string; image_url?: string | null; status: string; menu: MenuItem[] }[]> {
  const vendors = await getVendors();
  const open = vendors.filter((v) => v.status === 'open');
  
  const result = [];
  for (const v of open) {
    const menu = await getVendorMenu(v.id);
    const available = menu.filter((m) => m.active && m.available && m.price > 0);
    if (available.length > 0) {
      result.push({
        id: v.id,
        name: v.name,
        image_url: v.image_url,
        status: v.status,
        menu: available,
      });
    }
  }
  return result;
}

export interface VendorMonthlySettlement {
  id: number;
  vendor_id: string;
  vendor_name?: string;
  month: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string; // 'Pending', 'Partially Settled', 'Settled'
  updated_at: string;
}

const LOCAL_SETTLEMENTS_KEY = 'aharsetu_settlements_v1';

const FALLBACK_SETTLEMENTS: VendorMonthlySettlement[] = [
  { id: 1, vendor_id: 'v1', vendor_name: 'Sharma Canteen', month: 'August 2026', total_amount: 15000.0, paid_amount: 12000.0, due_amount: 3000.0, status: 'Partially Settled', updated_at: new Date().toISOString() },
  { id: 2, vendor_id: 'v2', vendor_name: 'Fresh Bites', month: 'August 2026', total_amount: 28400.0, paid_amount: 28400.0, due_amount: 0.0, status: 'Settled', updated_at: new Date().toISOString() },
  { id: 3, vendor_id: 'v3', vendor_name: 'Hot Meals', month: 'August 2026', total_amount: 5000.0, paid_amount: 0.0, due_amount: 5000.0, status: 'Pending', updated_at: new Date().toISOString() },
  { id: 4, vendor_id: 'v1', vendor_name: 'Sharma Canteen', month: 'July 2026', total_amount: 12000.0, paid_amount: 12000.0, due_amount: 0.0, status: 'Settled', updated_at: new Date().toISOString() },
  { id: 5, vendor_id: 'v2', vendor_name: 'Fresh Bites', month: 'July 2026', total_amount: 26400.0, paid_amount: 26400.0, due_amount: 0.0, status: 'Settled', updated_at: new Date().toISOString() },
];

function getLocalSettlements(): VendorMonthlySettlement[] {
  if (typeof window === 'undefined') return FALLBACK_SETTLEMENTS;
  try {
    const raw = localStorage.getItem(LOCAL_SETTLEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SETTLEMENTS_KEY, JSON.stringify(FALLBACK_SETTLEMENTS));
      return FALLBACK_SETTLEMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return FALLBACK_SETTLEMENTS;
  }
}

function saveLocalSettlements(list: VendorMonthlySettlement[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SETTLEMENTS_KEY, JSON.stringify(list));
}

export async function getMonthlySettlements(): Promise<VendorMonthlySettlement[]> {
  try {
    const res = await api.get<VendorMonthlySettlement[]>('/vendors/settlements');
    if (res && Array.isArray(res)) {
      return res;
    }
  } catch (err) {
    console.warn('[SETTLEMENTS] API fetch failed, serving local fallback');
  }
  return getLocalSettlements();
}

export async function getVendorMonthlySettlements(vendorId: string): Promise<VendorMonthlySettlement[]> {
  try {
    const res = await api.get<VendorMonthlySettlement[]>('/vendors/my-settlements');
    if (res && Array.isArray(res)) {
      return res;
    }
  } catch (err) {
    console.warn('[SETTLEMENTS] API fetch failed, serving local fallback');
  }
  return getLocalSettlements().filter(s => s.vendor_id === vendorId);
}

export async function updateMonthlySettlement(
  vendorId: string,
  month: string,
  paidAmount: number,
  totalAmount: number
): Promise<VendorMonthlySettlement> {
  try {
    const res = await api.post<VendorMonthlySettlement>('/vendors/settlements', {
      vendor_id: vendorId,
      month,
      paid_amount: paidAmount,
      total_amount: totalAmount,
    });
    if (res) return res;
  } catch (err) {
    console.warn('[SETTLEMENTS] API update failed, saving locally');
  }

  const list = getLocalSettlements();
  let target = list.find(s => s.vendor_id === vendorId && s.month === month);
  
  if (!target) {
    target = {
      id: Date.now(),
      vendor_id: vendorId,
      month,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: Math.max(0.0, totalAmount - paidAmount),
      status: 'Pending',
      updated_at: new Date().toISOString(),
    };
    list.push(target);
  } else {
    target.total_amount = totalAmount;
    target.paid_amount = paidAmount;
    target.due_amount = Math.max(0.0, totalAmount - paidAmount);
    target.updated_at = new Date().toISOString();
  }

  if (target.due_amount <= 0) {
    target.status = 'Settled';
  } else if (target.paid_amount > 0) {
    target.status = 'Partially Settled';
  } else {
    target.status = 'Pending';
  }

  saveLocalSettlements(list);
  return target;
}


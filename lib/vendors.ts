// ── AharSetu Enterprise Vendor & Menu Service ───────────────────────────────
import { api } from './api';

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

function saveLocalMenu(vendorId: string, items: MenuItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${LOCAL_MENUS_KEY}_${vendorId}`, JSON.stringify(items));
}

export async function getVendors(): Promise<Vendor[]> {
  try {
    const res = await api.get<Vendor[]>('/vendors/');
    if (res && Array.isArray(res) && res.length > 0) {
      saveLocalVendors(res);
      return res;
    }
  } catch (err) {
    // Return local fallback vendors silently
  }
  return getLocalVendors();
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const vendors = await getVendors();
  return vendors.find((v) => v.id === id) || null;
}

export async function getOpenVendors(): Promise<Vendor[]> {
  const vendors = await getVendors();
  return vendors.filter((v) => v.status === 'open');
}

export async function updateVendorStatus(vendorId: string, status: string): Promise<Vendor> {
  const vendors = getLocalVendors();
  const v = vendors.find(item => item.id === vendorId);
  if (v) {
    v.status = status;
    saveLocalVendors(vendors);
  }

  try {
    const res = await api.put<Vendor>(`/vendors/${vendorId}/status`, { status });
    if (res) {
      const idx = vendors.findIndex(item => item.id === vendorId);
      if (idx >= 0) vendors[idx] = res;
      saveLocalVendors(vendors);
      return res;
    }
  } catch (err) {
    // Return updated local vendor
  }

  if (v) return v;
  throw new Error('Vendor not found');
}

export async function getVendorMenu(vendorId: string): Promise<MenuItem[]> {
  try {
    const res = await api.get<MenuItem[]>(`/vendors/${vendorId}/menu`);
    if (res && Array.isArray(res)) {
      saveLocalMenu(vendorId, res);
      return res;
    }
  } catch (err) {
    console.warn(`[VENDORS] API menu fetch for ${vendorId} failed, serving local menu`);
  }
  return getLocalMenu(vendorId);
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
    active: payload.active
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

export async function getAvailableMenuByVendor(): Promise<{ id: string; name: string; menu: MenuItem[] }[]> {
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
        menu: available,
      });
    }
  }
  return result;
}

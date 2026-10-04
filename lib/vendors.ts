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
  { id: 'v1', name: 'Sharma Canteen', owner_name: 'Gadhvi Bhai', email: 'vendor1@aharsetu.edu.in', phone: '+91 9911223344', status: 'open', revenue: 0.0 },
  { id: 'v2', name: 'Fresh Bites', owner_name: 'Mitesh Bhai', email: 'vendor2@aharsetu.edu.in', phone: '+91 9922334455', status: 'open', revenue: 0.0 },
  { id: 'v3', name: 'Hot Meals', owner_name: 'Bhargav Bhai', email: 'vendor3@aharsetu.edu.in', phone: '+91 9933445566', status: 'open', revenue: 0.0 },
  { id: 'v4', name: 'Quick Snacks', owner_name: 'P. Mehta', email: 'vendor4@aharsetu.edu.in', phone: '+91 9944556677', status: 'open', revenue: 0.0 },
];

const FALLBACK_MENUS: Record<string, MenuItem[]> = {
  v1: [
    { id: 'v1m1', vendor_id: 'v1', name: 'Tea (Masala Chai)', price: 10.0, unit: 'per cup', available: true, active: true, category: 'Beverages', description: 'Freshly brewed masala tea with ginger, cardamom, and aromatic spices' },
    { id: 'v1m2', vendor_id: 'v1', name: 'Samosa (2 pcs)', price: 20.0, unit: 'per plate', available: true, active: true, category: 'Snacks', description: 'Crispy golden triangular pastry filled with spicy potato and peas filling' },
    { id: 'v1m3', vendor_id: 'v1', name: 'Kachori with Chutney', price: 20.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Flaky deep-fried snack stuffed with spiced lentils and served with tamarind chutney' },
    { id: 'v1m4', vendor_id: 'v1', name: 'Filter Coffee', price: 20.0, unit: 'per cup', available: true, active: true, category: 'Beverages', description: 'South Indian style hot filter coffee prepared with fresh frothed milk' },
    { id: 'v1m5', vendor_id: 'v1', name: 'Bread Pakoda', price: 25.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Spiced potato sandwich battered in seasoned besan and deep fried to perfection' },
    { id: 'v1m6', vendor_id: 'v1', name: 'Bun Maska', price: 25.0, unit: 'per plate', available: true, active: true, category: 'Snacks', description: 'Soft warm bun slathered with rich salted butter, perfect with hot chai' },
    { id: 'v1m7', vendor_id: 'v1', name: 'Poha Jalebi Combo', price: 45.0, unit: 'per plate', available: true, active: true, category: 'Breakfast', description: 'Indori style spiced flattened rice served with two crispy hot jalebis' },
    { id: 'v1m8', vendor_id: 'v1', name: 'Mineral Water (1L)', price: 20.0, unit: 'per bottle', available: true, active: true, category: 'Beverages', description: 'Chilled packaged drinking water bottle' },
  ],
  v2: [
    { id: 'v2m1', vendor_id: 'v2', name: 'Executive Veg Thali', price: 90.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Complete meal with 4 phulkas, paneer sabzi, seasonal veg, dal tadka, jeera rice, salad & gulab jamun' },
    { id: 'v2m2', vendor_id: 'v2', name: 'Idli Sambhar (2 pcs)', price: 40.0, unit: 'per plate', available: true, active: true, category: 'Breakfast', description: 'Steamed soft rice cakes served with hot vegetable sambhar and coconut chutney' },
    { id: 'v2m3', vendor_id: 'v2', name: 'Masala Dosa', price: 60.0, unit: 'per plate', available: true, active: true, category: 'Breakfast', description: 'Crispy golden fermented crepe stuffed with spiced potato mash, served with sambhar and chutneys' },
    { id: 'v2m4', vendor_id: 'v2', name: 'Medu Vada (2 pcs)', price: 45.0, unit: 'per plate', available: true, active: true, category: 'Breakfast', description: 'Crispy golden lentil fritters served piping hot with sambhar and chutney' },
    { id: 'v2m5', vendor_id: 'v2', name: 'Fresh Fruit Bowl', price: 50.0, unit: 'per bowl', available: true, active: true, category: 'Snacks', description: 'Assortment of freshly cut seasonal fruits with chaat masala' },
    { id: 'v2m6', vendor_id: 'v2', name: 'Special Sweet Lassi', price: 35.0, unit: 'per glass', available: true, active: true, category: 'Beverages', description: 'Thick churned creamy yogurt drink garnished with pistachios and cardamom' },
    { id: 'v2m7', vendor_id: 'v2', name: 'Fresh Lime Soda', price: 25.0, unit: 'per glass', available: true, active: true, category: 'Beverages', description: 'Refreshing fizzy beverage with freshly squeezed lemon juice and mint' },
    { id: 'v2m8', vendor_id: 'v2', name: 'Veg Hakka Noodles', price: 70.0, unit: 'per plate', available: true, active: true, category: 'Chinese', description: 'Wok-tossed noodles with shredded cabbage, carrots, bell peppers and soy sauce' },
  ],
  v3: [
    { id: 'v3m1', vendor_id: 'v3', name: 'Deluxe North Indian Thali', price: 110.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Paneer butter masala, dal makhani, 4 butter rotis, peas pulao, raita, papad & sweet' },
    { id: 'v3m2', vendor_id: 'v3', name: 'Authentic Dal Baati Churma', price: 130.0, unit: 'per serving', available: true, active: true, category: 'Meals', description: 'Traditional baked wheat dough balls dipped in pure desi ghee, served with panchmel dal & sweet churma' },
    { id: 'v3m3', vendor_id: 'v3', name: 'Rajma Chawal Combo', price: 75.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Slow-cooked Kashmiri red kidney beans curry served with aromatic basmati rice and onion salad' },
    { id: 'v3m4', vendor_id: 'v3', name: 'Chole Bhature (2 pcs)', price: 80.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Spiced Punjabi chickpea curry served with two fluffy deep-fried bhaturas and pickle' },
    { id: 'v3m5', vendor_id: 'v3', name: 'Veg Biryani with Raita', price: 85.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Fragrant long-grain basmati rice cooked with fresh garden vegetables and whole spices' },
    { id: 'v3m6', vendor_id: 'v3', name: 'Paneer Paratha (2 pcs)', price: 70.0, unit: 'per plate', available: true, active: true, category: 'Meals', description: 'Whole wheat flatbread stuffed with spiced cottage cheese, served with curd and butter' },
    { id: 'v3m7', vendor_id: 'v3', name: 'Pav Bhaji', price: 65.0, unit: 'per plate', available: true, active: true, category: 'Snacks', description: 'Spiced mashed vegetable curry served with two butter-toasted pav buns and lemon wedges' },
    { id: 'v3m8', vendor_id: 'v3', name: 'Gulab Jamun (2 pcs)', price: 30.0, unit: 'per plate', available: true, active: true, category: 'Desserts', description: 'Soft milk-solid dumplings soaked in warm rose and cardamom scented sugar syrup' },
  ],
  v4: [
    { id: 'v4m1', vendor_id: 'v4', name: 'Grilled Cheese Veg Sandwich', price: 50.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Double layered sandwich with cucumber, tomato, potato, capsicum and melted cheddar cheese' },
    { id: 'v4m2', vendor_id: 'v4', name: 'Veg Burger with Fries', price: 65.0, unit: 'per plate', available: true, active: true, category: 'Fast Food', description: 'Crisp vegetable patty in a sesame bun with lettuce, tomatoes and mayonnaise, served with potato fries' },
    { id: 'v4m3', vendor_id: 'v4', name: 'Paneer Kathi Roll', price: 60.0, unit: 'per piece', available: true, active: true, category: 'Snacks', description: 'Flaky paratha wrap stuffed with marinated tandoori paneer, sliced onions and mint sauce' },
    { id: 'v4m4', vendor_id: 'v4', name: 'French Fries (Large)', price: 45.0, unit: 'per serving', available: true, active: true, category: 'Fast Food', description: 'Crispy golden salted potato fingers served with tomato ketchup' },
    { id: 'v4m5', vendor_id: 'v4', name: 'Cold Coffee with Ice Cream', price: 50.0, unit: 'per glass', available: true, active: true, category: 'Beverages', description: 'Rich blended cold coffee topped with a generous scoop of vanilla ice cream' },
    { id: 'v4m6', vendor_id: 'v4', name: 'Assorted Soft Drink (Can)', price: 35.0, unit: 'per can', available: true, active: true, category: 'Beverages', description: 'Chilled 300ml canned beverage' },
    { id: 'v4m7', vendor_id: 'v4', name: 'Masala Maggi', price: 35.0, unit: 'per bowl', available: true, active: true, category: 'Snacks', description: 'Classic 2-minute noodles tossed with butter, peas, onions, and special spices' },
    { id: 'v4m8', vendor_id: 'v4', name: 'Veg Cheese Pizza (7-inch)', price: 99.0, unit: 'per piece', available: true, active: true, category: 'Fast Food', description: 'Fresh thin crust pizza loaded with mozzarella cheese, capsicum, corn and onions' },
  ]
};

export function getMenuItem(menuItemId: string | null | undefined): MenuItem | null {
  if (!menuItemId) return null;
  const cleanId = menuItemId.replace('Item #', '').trim();

  // 1. Check updated localStorage menus across all vendors
  if (typeof window !== 'undefined') {
    const vIds = ['v1', 'v2', 'v3', 'v4'];
    for (const vId of vIds) {
      try {
        const raw = localStorage.getItem(`${LOCAL_MENUS_KEY}_${vId}`);
        if (raw) {
          const list: MenuItem[] = JSON.parse(raw);
          const found = list.find(m => m.id === cleanId || m.id === menuItemId);
          if (found) return found;
        }
      } catch {}
    }
  }

  // 2. Check fallback menus
  for (const list of Object.values(FALLBACK_MENUS)) {
    const found = list.find(m => m.id === cleanId || m.id === menuItemId);
    if (found) return found;
  }

  return null;
}

export function getMenuItemName(menuItemId: string | null | undefined, fallbackName?: string): string {
  if (!menuItemId) return fallbackName || 'Canteen Special Item';
  const cleanId = menuItemId.replace('Item #', '').trim();

  const item = getMenuItem(cleanId) || getMenuItem(menuItemId);
  if (item && item.name) return item.name;

  if (fallbackName && fallbackName !== cleanId && fallbackName !== 'Item' && !fallbackName.startsWith('Item #')) {
    return fallbackName;
  }

  if (cleanId.includes('v1m1')) return 'Tea (Masala Chai)';
  if (cleanId.includes('v1m2')) return 'Samosa (2 pcs)';
  if (cleanId.includes('v1m3')) return 'Kachori with Chutney';
  if (cleanId.includes('v1m4')) return 'Filter Coffee';
  if (cleanId.includes('v1m5')) return 'Bread Pakoda';
  if (cleanId.includes('v1m6')) return 'Bun Maska';
  if (cleanId.includes('v1m7')) return 'Poha Jalebi Combo';
  if (cleanId.includes('v1m8')) return 'Mineral Water (1L)';

  if (cleanId.includes('v2m1')) return 'Executive Veg Thali';
  if (cleanId.includes('v2m2')) return 'Idli Sambhar (2 pcs)';
  if (cleanId.includes('v2m3')) return 'Masala Dosa';
  if (cleanId.includes('v2m4')) return 'Medu Vada (2 pcs)';
  if (cleanId.includes('v2m5')) return 'Fresh Fruit Bowl';
  if (cleanId.includes('v2m6')) return 'Special Sweet Lassi';
  if (cleanId.includes('v2m7')) return 'Fresh Lime Soda';
  if (cleanId.includes('v2m8')) return 'Veg Hakka Noodles';

  if (cleanId.includes('v3m1')) return 'Deluxe North Indian Thali';
  if (cleanId.includes('v3m2')) return 'Authentic Dal Baati Churma';
  if (cleanId.includes('v3m3')) return 'Rajma Chawal Combo';
  if (cleanId.includes('v3m4')) return 'Chole Bhature (2 pcs)';
  if (cleanId.includes('v3m5')) return 'Veg Biryani with Raita';
  if (cleanId.includes('v3m6')) return 'Paneer Paratha (2 pcs)';
  if (cleanId.includes('v3m7')) return 'Pav Bhaji';
  if (cleanId.includes('v3m8')) return 'Gulab Jamun (2 pcs)';

  if (cleanId.includes('v4m1')) return 'Grilled Cheese Veg Sandwich';
  if (cleanId.includes('v4m2')) return 'Veg Burger with Fries';
  if (cleanId.includes('v4m3')) return 'Paneer Kathi Roll';
  if (cleanId.includes('v4m4')) return 'French Fries (Large)';
  if (cleanId.includes('v4m5')) return 'Cold Coffee with Ice Cream';
  if (cleanId.includes('v4m6')) return 'Assorted Soft Drink (Can)';
  if (cleanId.includes('v4m7')) return 'Masala Maggi';
  if (cleanId.includes('v4m8')) return 'Veg Cheese Pizza (7-inch)';

  if (/^[a-z][0-9][a-z][0-9]+/i.test(cleanId) || /^v\d+m\d+/i.test(cleanId)) {
    return 'Special Canteen Refreshment';
  }

  return fallbackName || cleanId;
}

function getLocalVendors(): Vendor[] {
  if (typeof window === 'undefined') return FALLBACK_VENDORS;
  try {
    const raw = localStorage.getItem(LOCAL_VENDORS_KEY);
    if (!raw) {
      // Return in-memory fallback but do NOT write it to localStorage.
      // Writing here would overwrite data that the API is about to deliver,
      // creating a race where stale hardcoded names persist until next hard reload.
      return FALLBACK_VENDORS;
    }
    return JSON.parse(raw);
  } catch {
    return FALLBACK_VENDORS;
  }
}

function saveLocalVendors(vendors: Vendor[]) {
  if (typeof window === 'undefined') return;
  const current = localStorage.getItem(LOCAL_VENDORS_KEY);
  const sorted = [...vendors].sort((a, b) => a.id.localeCompare(b.id));
  const next = JSON.stringify(sorted);
  if (current === next) return;
  localStorage.setItem(LOCAL_VENDORS_KEY, next);
}

function getLocalMenu(vendorId: string): MenuItem[] {
  if (typeof window === 'undefined') return FALLBACK_MENUS[vendorId] || [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MENUS_KEY}_${vendorId}`);
    if (!raw) {
      return FALLBACK_MENUS[vendorId] || [];
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
  const key = `${LOCAL_MENUS_KEY}_${vendorId}`;
  const current = localStorage.getItem(key);
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const next = JSON.stringify(sorted);
  if (current === next) return;
  localStorage.setItem(key, next);
}

export async function getVendors(): Promise<Vendor[]> {
  try {
    const apiVendors = await api.get<Vendor[]>('/vendors');
    if (apiVendors && Array.isArray(apiVendors) && apiVendors.length > 0) {
      // Backend is authoritative source of truth. Save to local storage for offline use.
      saveLocalVendors(apiVendors);
      return apiVendors;
    }
  } catch (err) {
    console.warn('[VENDORS] API fetch failed, using local fallback:', err);
  }
  // True offline fallback — use cached or fallback vendors
  return getLocalVendors();
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const vendors = await getVendors();
  return vendors.find((v) => v.id === id) || null;
}

export function isVendorOpen(status?: string | null): boolean {
  if (!status) return true;
  const s = status.trim().toLowerCase();
  if (s === 'open' || s === 'opened' || s === 'active' || s === 'available') {
    return true;
  }
  if (s === 'closed' || s === 'temporarily_unavailable' || s === 'inactive' || s === 'disabled') {
    return false;
  }
  return true;
}

export async function getOpenVendors(): Promise<Vendor[]> {
  const vendors = await getVendors();
  return vendors.filter((v) => isVendorOpen(v.status));
}

export async function getAvailableVendors(): Promise<Vendor[]> {
  const vendors = await getVendors();
  const openVendors = vendors.filter((v) => isVendorOpen(v.status));
  
  const promises = openVendors.map(async (v) => {
    try {
      const menu = await getVendorMenu(v.id);
      const availableItems = menu.filter((m) => m.active !== false && m.available !== false && Number(m.price) > 0);
      if (availableItems.length > 0) {
        return { ...v, menu_items: availableItems };
      }
    } catch (err) {
      console.warn(`[VENDORS] Error fetching menu for available vendor ${v.id}:`, err);
    }
    const fallbackItems = (FALLBACK_MENUS[v.id] || []).filter((m) => m.active !== false && m.available !== false && Number(m.price) > 0);
    if (fallbackItems.length > 0) {
      return { ...v, menu_items: fallbackItems };
    }
    return null;
  });

  const resolved = await Promise.all(promises);
  return resolved.filter(Boolean) as Vendor[];
}

export async function updateVendorStatus(vendorId: string, status: string): Promise<Vendor> {
  try {
    const session = getSession();
    let res: Vendor | undefined;
    if (session?.role === 'vendor') {
      // Vendor always uses the /me/availability endpoint — identity comes from JWT
      res = await api.patch<Vendor>('/vendors/me/availability', { status });
    } else {
      res = await api.put<Vendor>(`/vendors/${vendorId}/status`, { status });
    }

    if (res) {
      // Update local storage cache
      const local = getLocalVendors();
      const updatedList = local.map(v => v.id === vendorId ? { ...v, ...res } : v);
      saveLocalVendors(updatedList);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aharsetu_vendor_status_changed', { detail: { vendorId, status, vendor: res } }));
      }
      return res;
    }
  } catch (err: any) {
    // Auth failures (401, 403) and validation errors (422) must propagate to the caller.
    // Only connectivity failures (503, network error) should fall back to localStorage.
    if (err?.status === 401 || err?.status === 403 || err?.status === 422 || err?.status === 404) {
      throw err;
    }
    // Network / backend-down — fall through to offline localStorage update
    console.warn(`[VENDORS] Backend unreachable for status update on ${vendorId} — using offline fallback:`, err?.message);
  }

  // Offline fallback: update localStorage only (backend is genuinely down)
  const localVendors = await getVendors();
  const target = localVendors.find(v => v.id === vendorId) || FALLBACK_VENDORS.find(v => v.id === vendorId);
  if (target) {
    const updated = { ...target, status };
    const nextList = localVendors.map(v => v.id === vendorId ? updated : v);
    saveLocalVendors(nextList);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aharsetu_vendor_status_changed', { detail: { vendorId, status, vendor: updated } }));
    }
    return updated;
  }

  return {
    id: vendorId,
    name: 'Canteen Vendor',
    owner_name: 'Manager',
    email: `${vendorId}@aharsetu.edu.in`,
    phone: '',
    status: status,
    revenue: 0.0
  };
}

export async function updateVendorProfile(vendorId: string, data: Partial<Vendor>): Promise<Vendor> {
  let updatedVendor: Vendor | null = null;
  try {
    const res = await api.put<Vendor>(`/vendors/${vendorId}`, data);
    if (res) updatedVendor = res;
  } catch (err: any) {
    // Auth failures, permission errors, and validation rejections mean the backend
    // rejected the change — re-throw so the caller can surface the error to the user.
    // Only genuine network/connectivity failures (503, no status) fall through to
    // the localStorage-only fallback path below.
    if (err?.status === 401 || err?.status === 403 || err?.status === 404 || err?.status === 422) {
      throw err;
    }
    console.warn(`[VENDORS] API vendor profile update failed for ${vendorId} (backend unreachable), updating locally:`, err);
  }

  const vendors = getLocalVendors();
  const idx = vendors.findIndex(v => v.id === vendorId);
  const current = idx >= 0 ? vendors[idx] : {
    id: vendorId,
    name: data.name || 'Canteen Vendor',
    owner_name: data.owner_name || 'Proprietor',
    email: data.email || `${vendorId}@aharsetu.edu.in`,
    phone: data.phone || '',
    status: data.status || 'open',
    revenue: 0.0
  };

  const finalVendor: Vendor = updatedVendor || {
    ...current,
    ...data,
  };

  if (idx >= 0) {
    vendors[idx] = finalVendor;
  } else {
    vendors.push(finalVendor);
  }
  saveLocalVendors(vendors);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aharsetu_vendor_updated', { detail: { vendorId, vendor: finalVendor } }));
    window.dispatchEvent(new CustomEvent('aharsetu_vendors_changed', { detail: { vendorId, vendor: finalVendor } }));
  }

  return finalVendor;
}

export async function deleteSettlement(settlementId: number): Promise<void> {
  try {
    await api.delete(`/settlements/${settlementId}`);
  } catch (err) {
    console.warn(`[SETTLEMENTS] API settlement delete failed for #${settlementId}:`, err);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aharsetu_settlement_deleted', { detail: { settlementId } }));
  }
}

export async function getVendorMenu(vendorId: string): Promise<MenuItem[]> {
  // Always prefer API — backend is source of truth for menu state
  try {
    const res = await api.get<MenuItem[]>(`/vendors/${vendorId}/menu`);
    if (res && Array.isArray(res)) {
      saveLocalMenu(vendorId, res);
      return res;
    }
  } catch (err) {
    console.warn(`[VENDORS] API menu fetch for ${vendorId} failed, serving local fallback`);
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
    image_url: item.image_url || null,
  };

  let savedItem: MenuItem | null = null;
  try {
    const res = await api.post<MenuItem>(`/vendors/${vendorId}/menu`, payload);
    if (res) savedItem = res;
  } catch (err) {
    console.warn('[VENDORS] API menu update failed, saving locally');
  }

  const menu = getLocalMenu(vendorId);
  const newItem: MenuItem = savedItem || {
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

  // Synchronize item names in any pending/active local orders
  if (typeof window !== 'undefined') {
    try {
      const rawOrders = localStorage.getItem('aharsetu_orders_v8');
      if (rawOrders) {
        const orders = JSON.parse(rawOrders);
        let modified = false;
        orders.forEach((o: any) => {
          if (Array.isArray(o.vendor_orders)) {
            o.vendor_orders.forEach((vo: any) => {
              if (Array.isArray(vo.items)) {
                vo.items.forEach((it: any) => {
                  if (it.menu_item_id === newItem.id) {
                    it.name = newItem.name;
                    if (newItem.unit) it.unit = newItem.unit;
                    modified = true;
                  }
                });
              }
            });
          }
        });
        if (modified) {
          localStorage.setItem('aharsetu_orders_v8', JSON.stringify(orders));
          window.dispatchEvent(new CustomEvent('aharsetu_order_changed', { detail: { source: 'menu_update' } }));
        }
      }
      window.dispatchEvent(new CustomEvent('aharsetu_menu_updated', { detail: { vendor_id: vendorId, item: newItem } }));
    } catch {}
  }

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

export function getCachedAvailableMenuByVendor(): { id: string; name: string; image_url?: string | null; status: string; menu: MenuItem[] }[] {
  try {
    const vendors = getLocalVendors();
    const open = vendors.filter((v) => isVendorOpen(v.status));
    const result: { id: string; name: string; image_url?: string | null; status: string; menu: MenuItem[] }[] = [];
    for (const v of open) {
      const menu = getLocalMenu(v.id);
      const available = menu.filter((m) => m.active !== false && m.available !== false && Number(m.price) > 0);
      if (available.length > 0) {
        result.push({
          id: v.id,
          name: v.name,
          image_url: v.image_url,
          status: v.status || 'open',
          menu: available,
        });
      }
    }
    if (result.length > 0) return result;
  } catch (err) {
    console.warn('[VENDORS] Error reading cached available menu:', err);
  }
  // Ultimate emergency fallback: use FALLBACK_VENDORS with FALLBACK_MENUS
  return FALLBACK_VENDORS.map((v) => ({
    id: v.id,
    name: v.name,
    image_url: v.image_url,
    status: v.status || 'open',
    menu: FALLBACK_MENUS[v.id] || [],
  }));
}

export async function getAvailableMenuByVendor(): Promise<{ id: string; name: string; image_url?: string | null; status: string; menu: MenuItem[] }[]> {
  try {
    const vendors = await getVendors();
    const open = vendors.filter((v) => isVendorOpen(v.status));
    
    const menuPromises = open.map(async (v) => {
      try {
        const menu = await getVendorMenu(v.id);
        const available = menu.filter((m) => m.active !== false && m.available !== false && Number(m.price) > 0);
        if (available.length > 0) {
          return {
            id: v.id,
            name: v.name,
            image_url: v.image_url,
            status: v.status || 'open',
            menu: available,
          };
        }
      } catch (err) {
        console.warn(`[VENDORS] Error fetching menu for vendor ${v.id}:`, err);
      }
      const fallbackMenu = (FALLBACK_MENUS[v.id] || []).filter((m) => m.active !== false && m.available !== false && Number(m.price) > 0);
      if (fallbackMenu.length > 0) {
        return {
          id: v.id,
          name: v.name,
          image_url: v.image_url,
          status: v.status || 'open',
          menu: fallbackMenu,
        };
      }
      return null;
    });

    const result = (await Promise.all(menuPromises)).filter(Boolean) as { id: string; name: string; image_url?: string | null; status: string; menu: MenuItem[] }[];
    if (result.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('[VENDORS] Error in getAvailableMenuByVendor:', err);
  }

  return getCachedAvailableMenuByVendor();
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

const LOCAL_SETTLEMENTS_KEY = 'aharsetu_settlements_v8';

const FALLBACK_SETTLEMENTS: VendorMonthlySettlement[] = [];

function getLocalSettlements(): VendorMonthlySettlement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SETTLEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SETTLEMENTS_KEY, JSON.stringify([]));
      return [];
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveLocalSettlements(list: VendorMonthlySettlement[]) {
  if (typeof window === 'undefined') return;
  const current = localStorage.getItem(LOCAL_SETTLEMENTS_KEY);
  const sorted = [...list].sort((a, b) => {
    if (a.vendor_id !== b.vendor_id) return a.vendor_id.localeCompare(b.vendor_id);
    return a.month.localeCompare(b.month);
  });
  const next = JSON.stringify(sorted);
  if (current === next) return;
  localStorage.setItem(LOCAL_SETTLEMENTS_KEY, next);
}

function syncLocalMonthlySettlements(): VendorMonthlySettlement[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawSettlements = localStorage.getItem(LOCAL_SETTLEMENTS_KEY);
    const existingList: VendorMonthlySettlement[] = rawSettlements ? JSON.parse(rawSettlements) : [];
    const settlementMap = new Map<string, VendorMonthlySettlement>();
    for (const s of existingList) {
      if (s.vendor_id && s.month) {
        settlementMap.set(`${s.vendor_id}_${s.month}`, { ...s });
      }
    }

    // Tally orders from local storage
    const rawOrders = localStorage.getItem('aharsetu_orders_v8');
    const orders = rawOrders ? JSON.parse(rawOrders) : [];
    const billedByVendorMonth = new Map<string, number>();

    if (Array.isArray(orders)) {
      for (const order of orders) {
        const isCancelled = [
          'Cancelled',
          'Coordinator Cancelled',
          'Principal Rejected',
          'DCR Rejected',
          'Admin Rejected',
          'Vendor Rejected',
          'Rejected',
          'Draft'
        ].includes(order.status);
        if (isCancelled) continue;

        const isCompleted = ['Completed', 'Bill Generated'].includes(order.status);
        if (!isCompleted) continue;

        const dateStr = order.created_at || order.bill_generated_at || new Date().toISOString();
        const month = dateStr.slice(0, 7);

        if (Array.isArray(order.vendor_orders)) {
          for (const vo of order.vendor_orders) {
            if (vo.vendor_id && (vo.bill_amount || vo.items)) {
              let voAmt = Number(vo.bill_amount || 0);
              if (voAmt === 0 && Array.isArray(vo.items)) {
                voAmt = vo.items.reduce((s: number, it: any) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
              }
              const key = `${vo.vendor_id}_${month}`;
              billedByVendorMonth.set(key, (billedByVendorMonth.get(key) || 0) + voAmt);
            }
          }
        }
      }
    }

    // Merge calculated billed totals into settlements
    const allKeys = new Set([...settlementMap.keys(), ...billedByVendorMonth.keys()]);
    const syncedList: VendorMonthlySettlement[] = [];

    allKeys.forEach(key => {
      const [vendorId, month] = key.split('_');
      const existing = settlementMap.get(key);
      const calculatedTotal = billedByVendorMonth.get(key) || 0;
      const totalAmount = Math.max(Number(existing?.total_amount || 0), calculatedTotal);
      const paidAmount = Number(existing?.paid_amount || 0);
      const dueAmount = Math.max(0, totalAmount - paidAmount);
      const status = dueAmount <= 0 && totalAmount > 0 ? 'Settled' : (paidAmount > 0 ? 'Partially Settled' : (totalAmount === 0 && paidAmount === 0 ? 'Settled' : 'Pending'));

      syncedList.push({
        id: existing?.id || Math.floor(Math.random() * 100000),
        vendor_id: vendorId,
        vendor_name: existing?.vendor_name,
        month,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        status,
        updated_at: new Date().toISOString()
      });
    });

    saveLocalSettlements(syncedList);
    return syncedList;
  } catch (err) {
    console.error('[SETTLEMENTS] Local sync error:', err);
    return getLocalSettlements();
  }
}

export async function getMonthlySettlements(): Promise<VendorMonthlySettlement[]> {
  try {
    const res = await api.get<VendorMonthlySettlement[]>('/vendors/settlements');
    if (res && Array.isArray(res)) {
      saveLocalSettlements(res);
      return res;
    }
  } catch (err) {
    console.warn('[SETTLEMENTS] API fetch failed, serving synced local fallback');
  }
  return syncLocalMonthlySettlements();
}

export async function getVendorMonthlySettlements(vendorId: string): Promise<VendorMonthlySettlement[]> {
  try {
    const res = await api.get<VendorMonthlySettlement[]>('/vendors/my-settlements');
    if (res && Array.isArray(res) && res.length > 0) {
      saveLocalSettlements(res);
      return res;
    }
  } catch (err) {
    // If /my-settlements is restricted (e.g. non-vendor admin testing), try /vendors/settlements
    try {
      const all = await api.get<VendorMonthlySettlement[]>('/vendors/settlements');
      if (all && Array.isArray(all)) {
        const filtered = all.filter(s => s.vendor_id === vendorId);
        saveLocalSettlements(all);
        return filtered;
      }
    } catch {}
  }
  const allSynced = syncLocalMonthlySettlements();
  return allSynced.filter(s => s.vendor_id === vendorId);
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
    if (res) {
      const list = getLocalSettlements();
      const idx = list.findIndex(s => s.vendor_id === vendorId && s.month === month);
      if (idx >= 0) list[idx] = res;
      else list.unshift(res);
      saveLocalSettlements(list);
      return res;
    }
    throw new Error('No response from server');
  } catch (err: any) {
    console.warn('[SETTLEMENTS] API update failed, applying local update:', err);
    // Offline local update
    const list = syncLocalMonthlySettlements();
    const idx = list.findIndex(s => s.vendor_id === vendorId && s.month === month);
    const existingTotal = idx >= 0 ? list[idx].total_amount : 0;
    const finalTotal = Math.max(totalAmount, existingTotal);
    const due = Math.max(0, finalTotal - paidAmount);
    const updatedRecord: VendorMonthlySettlement = {
      id: idx >= 0 ? list[idx].id : Math.floor(Math.random() * 100000),
      vendor_id: vendorId,
      month,
      total_amount: finalTotal,
      paid_amount: paidAmount,
      due_amount: due,
      status: due <= 0 && finalTotal > 0 ? 'Settled' : (paidAmount > 0 ? 'Partially Settled' : 'Pending'),
      updated_at: new Date().toISOString()
    };
    if (idx >= 0) list[idx] = updatedRecord;
    else list.unshift(updatedRecord);
    saveLocalSettlements(list);
    return updatedRecord;
  }
}



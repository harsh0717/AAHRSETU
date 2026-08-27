// ── AharSetu Vendor Inventory & Stock Management Service ───────────────────────
import { api } from './api';
import { pushNotification } from './notifications';

export interface InventoryItem {
  id: string;
  vendor_id: string;
  menu_item_id: string;
  item_name: string;
  current_stock: number;
  unit: string;
  low_stock_threshold: number;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  last_updated: string;
}

const LOCAL_INVENTORY_KEY = 'aharsetu_inventory_v4';

const INITIAL_INVENTORY: InventoryItem[] = [
  // v1: Sharma Canteen
  { id: 'inv-v1-m1', vendor_id: 'v1', menu_item_id: 'v1m1', item_name: 'Tea (Masala Chai)', current_stock: 120, unit: 'cups', low_stock_threshold: 20, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m2', vendor_id: 'v1', menu_item_id: 'v1m2', item_name: 'Samosa (2 pcs)', current_stock: 45, unit: 'plates', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m3', vendor_id: 'v1', menu_item_id: 'v1m3', item_name: 'Kachori with Chutney', current_stock: 30, unit: 'pieces', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m4', vendor_id: 'v1', menu_item_id: 'v1m4', item_name: 'Filter Coffee', current_stock: 80, unit: 'cups', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m5', vendor_id: 'v1', menu_item_id: 'v1m5', item_name: 'Bread Pakoda', current_stock: 25, unit: 'pieces', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m6', vendor_id: 'v1', menu_item_id: 'v1m6', item_name: 'Bun Maska', current_stock: 40, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m7', vendor_id: 'v1', menu_item_id: 'v1m7', item_name: 'Poha Jalebi Combo', current_stock: 35, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m8', vendor_id: 'v1', menu_item_id: 'v1m8', item_name: 'Mineral Water (1L)', current_stock: 100, unit: 'bottles', low_stock_threshold: 20, status: 'AVAILABLE', last_updated: new Date().toISOString() },

  // v2: Fresh Bites
  { id: 'inv-v2-m1', vendor_id: 'v2', menu_item_id: 'v2m1', item_name: 'Executive Veg Thali', current_stock: 50, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m2', vendor_id: 'v2', menu_item_id: 'v2m2', item_name: 'Idli Sambhar (2 pcs)', current_stock: 30, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m3', vendor_id: 'v2', menu_item_id: 'v2m3', item_name: 'Masala Dosa', current_stock: 40, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m4', vendor_id: 'v2', menu_item_id: 'v2m4', item_name: 'Medu Vada (2 pcs)', current_stock: 30, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m5', vendor_id: 'v2', menu_item_id: 'v2m5', item_name: 'Fresh Fruit Bowl', current_stock: 25, unit: 'bowls', low_stock_threshold: 8, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m6', vendor_id: 'v2', menu_item_id: 'v2m6', item_name: 'Special Sweet Lassi', current_stock: 60, unit: 'glasses', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m7', vendor_id: 'v2', menu_item_id: 'v2m7', item_name: 'Fresh Lime Soda', current_stock: 50, unit: 'glasses', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m8', vendor_id: 'v2', menu_item_id: 'v2m8', item_name: 'Veg Hakka Noodles', current_stock: 35, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },

  // v3: Hot Meals
  { id: 'inv-v3-m1', vendor_id: 'v3', menu_item_id: 'v3m1', item_name: 'Deluxe North Indian Thali', current_stock: 40, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m2', vendor_id: 'v3', menu_item_id: 'v3m2', item_name: 'Authentic Dal Baati Churma', current_stock: 25, unit: 'servings', low_stock_threshold: 8, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m3', vendor_id: 'v3', menu_item_id: 'v3m3', item_name: 'Rajma Chawal Combo', current_stock: 35, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m4', vendor_id: 'v3', menu_item_id: 'v3m4', item_name: 'Chole Bhature (2 pcs)', current_stock: 30, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m5', vendor_id: 'v3', menu_item_id: 'v3m5', item_name: 'Veg Biryani with Raita', current_stock: 45, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m6', vendor_id: 'v3', menu_item_id: 'v3m6', item_name: 'Paneer Paratha (2 pcs)', current_stock: 30, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m7', vendor_id: 'v3', menu_item_id: 'v3m7', item_name: 'Pav Bhaji', current_stock: 40, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v3-m8', vendor_id: 'v3', menu_item_id: 'v3m8', item_name: 'Gulab Jamun (2 pcs)', current_stock: 50, unit: 'plates', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },

  // v4: Quick Snacks
  { id: 'inv-v4-m1', vendor_id: 'v4', menu_item_id: 'v4m1', item_name: 'Grilled Cheese Veg Sandwich', current_stock: 45, unit: 'pieces', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m2', vendor_id: 'v4', menu_item_id: 'v4m2', item_name: 'Veg Burger with Fries', current_stock: 30, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m3', vendor_id: 'v4', menu_item_id: 'v4m3', item_name: 'Paneer Kathi Roll', current_stock: 35, unit: 'pieces', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m4', vendor_id: 'v4', menu_item_id: 'v4m4', item_name: 'French Fries (Large)', current_stock: 40, unit: 'servings', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m5', vendor_id: 'v4', menu_item_id: 'v4m5', item_name: 'Cold Coffee with Ice Cream', current_stock: 50, unit: 'glasses', low_stock_threshold: 12, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m6', vendor_id: 'v4', menu_item_id: 'v4m6', item_name: 'Assorted Soft Drink (Can)', current_stock: 60, unit: 'cans', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m7', vendor_id: 'v4', menu_item_id: 'v4m7', item_name: 'Masala Maggi', current_stock: 50, unit: 'bowls', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v4-m8', vendor_id: 'v4', menu_item_id: 'v4m8', item_name: 'Veg Cheese Pizza (7-inch)', current_stock: 25, unit: 'pieces', low_stock_threshold: 8, status: 'AVAILABLE', last_updated: new Date().toISOString() },
];

function getLocalInventory(): InventoryItem[] {
  if (typeof window === 'undefined') return INITIAL_INVENTORY;
  try {
    const raw = localStorage.getItem(LOCAL_INVENTORY_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify(INITIAL_INVENTORY));
      return INITIAL_INVENTORY;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INVENTORY;
  }
}

function saveLocalInventory(list: InventoryItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify(list));
}

export async function getVendorInventory(vendorId: string): Promise<InventoryItem[]> {
  try {
    const res = await api.get<InventoryItem[]>(`/vendors/${vendorId}/inventory`);
    if (res && Array.isArray(res)) return res;
  } catch {}
  
  const list = getLocalInventory();
  return list.filter(i => i.vendor_id === vendorId);
}

export async function deductInventoryStock(vendorId: string, menuItemId: string, quantityDeducted: number): Promise<InventoryItem | null> {
  const list = getLocalInventory();
  const item = list.find(i => i.vendor_id === vendorId && i.menu_item_id === menuItemId);
  if (item) {
    item.current_stock = Math.max(0, item.current_stock - quantityDeducted);
    item.last_updated = new Date().toISOString();
    
    if (item.current_stock <= 0) {
      item.status = 'OUT_OF_STOCK';
      pushNotification(`${item.item_name} is OUT OF STOCK. Menu item auto-disabled.`, 'vendor', undefined, { vendor_id: vendorId, type: 'SYSTEM_ALERT' });
    } else if (item.current_stock <= item.low_stock_threshold) {
      item.status = 'LOW_STOCK';
      pushNotification(`${item.item_name} stock is low (${item.current_stock} remaining). Reorder soon.`, 'vendor', undefined, { vendor_id: vendorId, type: 'SYSTEM_ALERT' });
    } else {
      item.status = 'AVAILABLE';
    }

    saveLocalInventory(list);
    return item;
  }
  return null;
}

export async function updateInventoryStock(vendorId: string, menuItemId: string, newStock: number): Promise<InventoryItem> {
  const list = getLocalInventory();
  let item = list.find(i => i.vendor_id === vendorId && i.menu_item_id === menuItemId);
  if (item) {
    item.current_stock = Math.max(0, newStock);
    item.last_updated = new Date().toISOString();
    item.status = item.current_stock <= 0 ? 'OUT_OF_STOCK' : item.current_stock <= item.low_stock_threshold ? 'LOW_STOCK' : 'AVAILABLE';
  } else {
    item = {
      id: `inv-${vendorId}-${menuItemId}`,
      vendor_id: vendorId,
      menu_item_id: menuItemId,
      item_name: 'Canteen Item',
      current_stock: Math.max(0, newStock),
      unit: 'units',
      low_stock_threshold: 10,
      status: newStock <= 0 ? 'OUT_OF_STOCK' : 'AVAILABLE',
      last_updated: new Date().toISOString()
    };
    list.push(item);
  }
  saveLocalInventory(list);
  return item;
}

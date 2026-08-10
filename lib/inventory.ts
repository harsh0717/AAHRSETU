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
  { id: 'inv-v1-m1', vendor_id: 'v1', menu_item_id: 'v1m1', item_name: 'Tea', current_stock: 120, unit: 'cups', low_stock_threshold: 20, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m2', vendor_id: 'v1', menu_item_id: 'v1m2', item_name: 'Samosa', current_stock: 45, unit: 'pieces', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m3', vendor_id: 'v1', menu_item_id: 'v1m3', item_name: 'Kachori', current_stock: 10, unit: 'pieces', low_stock_threshold: 15, status: 'LOW_STOCK', last_updated: new Date().toISOString() },
  { id: 'inv-v1-m4', vendor_id: 'v1', menu_item_id: 'v1m4', item_name: 'Coffee', current_stock: 80, unit: 'cups', low_stock_threshold: 15, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m1', vendor_id: 'v2', menu_item_id: 'v2m1', item_name: 'Veg Lunch', current_stock: 50, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() },
  { id: 'inv-v2-m2', vendor_id: 'v2', menu_item_id: 'v2m2', item_name: 'Idli Sambhar', current_stock: 30, unit: 'plates', low_stock_threshold: 10, status: 'AVAILABLE', last_updated: new Date().toISOString() }
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

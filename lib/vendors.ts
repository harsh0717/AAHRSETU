// ── AharSetu Enterprise Vendor & Menu Service ───────────────────────────────
import { api } from './api';

export interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  unit: string;
  available: boolean;
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

export async function getVendors(): Promise<Vendor[]> {
  try {
    return await api.get<Vendor[]>('/vendors/');
  } catch (err) {
    console.error('Error loading vendors:', err);
    return [];
  }
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
  return await api.put<Vendor>(`/vendors/${vendorId}/status`, { status });
}

export async function getVendorMenu(vendorId: string): Promise<MenuItem[]> {
  try {
    return await api.get<MenuItem[]>(`/vendors/${vendorId}/menu`);
  } catch (err) {
    console.error(`Error loading menu for vendor ${vendorId}:`, err);
    return [];
  }
}

export async function upsertVendorMenuItem(vendorId: string, item: any): Promise<MenuItem> {
  // If it's a new item, item.id is undefined/empty
  // Match backend signature: payload is VendorMenuItemCreate
  const payload = {
    id: item.id || null,
    name: item.name,
    price: parseFloat(item.price),
    unit: item.unit || 'per plate',
    available: item.available !== false,
  };
  return await api.post<MenuItem>(`/vendors/${vendorId}/menu`, payload);
}

export async function deleteVendorMenuItem(vendorId: string, itemId: string): Promise<void> {
  await api.delete(`/vendors/${vendorId}/menu/${itemId}`);
}

export async function getAvailableMenuByVendor(): Promise<{ id: string; name: string; menu: MenuItem[] }[]> {
  const vendors = await getVendors();
  const open = vendors.filter((v) => v.status === 'open');
  
  const result = [];
  for (const v of open) {
    const menu = await getVendorMenu(v.id);
    const available = menu.filter((m) => m.available);
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

// ── AharSetu Vendor Store ─────────────────────────────────────────────────────
import { SEED_VENDORS } from './seedUsers';

const VENDORS_KEY = 'aharsetu_vendors';

export function getVendors() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VENDORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveVendors(vendors) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
}

export function getVendorById(id) {
  return getVendors().find(v => v.id === id) || null;
}

export function getOpenVendors() {
  return getVendors().filter(v => v.status === 'open');
}

export function upsertVendor(vendor) {
  const vendors = getVendors();
  const idx = vendors.findIndex(v => v.id === vendor.id);
  if (idx >= 0) vendors[idx] = vendor;
  else vendors.push(vendor);
  saveVendors(vendors);
  return vendor;
}

export function updateVendorStatus(vendorId, status) {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;
  return upsertVendor({ ...vendor, status });
}

export function getVendorMenu(vendorId) {
  const vendor = getVendorById(vendorId);
  return vendor?.menu || [];
}

export function upsertVendorMenuItem(vendorId, item) {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;
  const menu = vendor.menu || [];
  const idx = menu.findIndex(m => m.id === item.id);
  if (idx >= 0) menu[idx] = item;
  else menu.push({ ...item, vendorId, vendorName: vendor.name });
  return upsertVendor({ ...vendor, menu });
}

export function deleteVendorMenuItem(vendorId, itemId) {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;
  const menu = (vendor.menu || []).filter(m => m.id !== itemId);
  return upsertVendor({ ...vendor, menu });
}

export function updateVendorRevenue(vendorId, amount) {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;
  return upsertVendor({ ...vendor, revenue: (vendor.revenue || 0) + amount });
}

export function getAllMenuItems() {
  return getVendors().flatMap(v => v.menu || []);
}

export function getAvailableMenuByVendor() {
  // Returns open vendors with their available items only
  return getOpenVendors()
    .map(v => ({
      ...v,
      menu: (v.menu || []).filter(item => item.available),
    }))
    .filter(v => v.menu.length > 0);
}

export function initVendorsIfNeeded() {
  if (typeof window === 'undefined') return;
  const existing = getVendors();
  if (!existing.length) {
    saveVendors(SEED_VENDORS);
  }
}
